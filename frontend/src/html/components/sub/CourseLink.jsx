import React, { Component } from 'react';
import axios from 'axios';
import { AgGridReact } from 'ag-grid-react'; // React Data Grid Component
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import * as ExcelJS from 'exceljs';
import '../../../css/sub/CourseLink.css';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

class CourseLink extends Component {
  constructor(props) {
    super(props);
    this.state = {
      courseLinks: [],
      courses: [],
      filteredCourses: [],
      locations: [],
      languages: [],
      loading: false,
      error: null
    };
  }

  componentDidMount = async() => {
    await this.fetchCourses("");
  }

  async getTinyURL(longUrl) {
    try {
      const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      return response.data;
    } catch (error) {
      console.error('Error creating TinyURL:', error);
      return longUrl; // Return original URL if TinyURL fails
    }
  }

  exportToExcel = async () => {
    const { courseLinks } = this.state;
    
    try {
      const workbook = new ExcelJS.Workbook();
      const categories = ['NSA', 'ILP', 'Marriage Preparation Programme', 'Talks And Seminar'];
      const categoryColorMap = {
        'NSA': 'FFD4F1D4',           // Soft pastel green
        'ILP': 'FFFFD4D4',           // Soft pastel red
        'Marriage Preparation Programme': 'FFFFFD4', // Soft pastel yellow
        'Talks And Seminar': 'FFD4E8FF'  // Soft pastel blue
      };

      // Helper function to extract and filter categories (same as table)
      const extractFilteredCategories = (categoryValue) => {
        const allowedCategories = ['ILP', 'NSA', 'Marriage Preparation Programme', 'Talks And Seminar'];
        
        const extractMainCategory = (cat) => {
          const name = typeof cat === 'string' ? cat : (cat?.name || '');
          const parts = name.split(':');
          return parts.length > 1 ? parts[1].trim() : parts[0].trim();
        };

        const categoryList = Array.isArray(categoryValue) ? categoryValue : [categoryValue];
        const filtered = categoryList
          .map(extractMainCategory)
          .filter(cat => allowedCategories.includes(cat));
        
        return [...new Set(filtered)];
      };

      // Helper function to create worksheet with data
      const createWorksheet = (sheetName, dataToAdd, categoryFilter = null) => {
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        worksheet.columns = [
          { header: 'S/N', key: 'sn', width: 10 },
          { header: 'Course Name', key: 'name', width: 50 },
          { header: 'Centre Location', key: 'location', width: 30 },
          { header: 'Categories', key: 'categories', width: 30 },
          { header: 'Shortened URL', key: 'shortenedUrl', width: 40 }
        ];

        // Style header row (grey)
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF808080' } };

        // Add data rows
        let rowIndex = 2;
        let snCounter = 1;
        dataToAdd.forEach((link) => {
          const filteredCategories = extractFilteredCategories(link.categories);
          
          // Filter by category if specified
          if (categoryFilter && !filteredCategories.includes(categoryFilter)) {
            return;
          }

          const parts = link.name.split(/<br\s*\/?>/i);
          let courseName = parts[0];
          let location = parts[1] || '';
          
          if (parts.length === 3) {
            courseName = parts[1];
            location = parts[2];
          }
          
          location = location.replace(/[()]/g, '');

          worksheet.addRow({
            sn: snCounter,
            name: courseName,
            location: location,
            categories: filteredCategories.join(', '),
            shortenedUrl: link.shortenedUrl
          });

          // Apply background color to columns A-E
          const rowColor = categoryFilter ? categoryColorMap[categoryFilter] : categoryColorMap[filteredCategories[0]] || 'FFFFFFFF';
          const row = worksheet.getRow(rowIndex);
          for (let col = 1; col <= 5; col++) {
            const cell = row.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
          }
          
          // Set URL cell styling
          const urlCell = worksheet.getCell(`E${rowIndex}`);
          urlCell.value = link.shortenedUrl;
          urlCell.font = { color: { argb: 'FF0563C1' }, underline: 'single' };
          
          rowIndex++;
          snCounter++;
        });
      };

      // Create "All" worksheet first
      createWorksheet('All', courseLinks);

      // Create worksheet for each category
      categories.forEach((category) => {
        createWorksheet(category, courseLinks, category);
      });

      // Save the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Course_Links_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel');
    }
  }

  async fetchCourses(courseType) {
    try {
      this.setState({ loading: true });
      var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/courses/`, { courseType });
      var courses = response.data.courses;

      console.log("Courses:", courses);
      
      // Extract product names and permalinks with serial number and shortened URL
      const courseLinks = await Promise.all(courses.map(async (course, index) => {
        const shortenedUrl = await this.getTinyURL(course.permalink);
        return {
          sn: index + 1,
          name: course.name,
          permalink: course.permalink,
          shortenedUrl: shortenedUrl,
          categories: course.categories
        };
      }));

      // Update state with fetched data
      this.setState({
        courseLinks: courseLinks,
        loading: false
      });
        this.props.closePopup1();
    } catch (error) {
      console.error('Error fetching data:', error);
      this.setState({ loading: false, error: error.message });
        this.props.closePopup1();
    }
  }

  getRowStyle = (params) => {
    const categoryColorMap = {
      'NSA': '#D4F1D4',           // Soft pastel green
      'ILP': '#FFD4D4',           // Soft pastel red
      'Marriage Preparation Programme': '#FFFFD4', // Soft pastel yellow
      'Talks And Seminar': '#D4E8FF'  // Soft pastel blue
    };

    if (!params.data || !params.data.categories) return {};

    const extractMainCategory = (cat) => {
      const name = typeof cat === 'string' ? cat : (cat?.name || '');
      const parts = name.split(':');
      return parts.length > 1 ? parts[1].trim() : parts[0].trim();
    };

    const categories = Array.isArray(params.data.categories) ? params.data.categories : [params.data.categories];
    const extracted = categories.map(extractMainCategory);
    
    // Find first matching category color
    for (const cat of extracted) {
      if (categoryColorMap[cat]) {
        return { backgroundColor: categoryColorMap[cat] };
      }
    }
    
    return {};
  }


  render() {
    const { loading, courseLinks } = this.state;

    const columnDefs = [
      { field: 'sn', headerName: 'S/N', width: 80 },
      { 
        field: 'name', 
        headerName: 'Course Name', 
        width: 600,
        cellRenderer: (params) => {
          const parts = params.value.split(/<br\s*\/?>/i);
          let selectedPart = parts[0];
          if (parts.length === 3) {
            selectedPart = parts[1];
          }
          return selectedPart;
        }
      },
      { 
        field: 'name', 
        headerName: 'Centre Location', 
        width: 300,
        cellRenderer: (params) => {
          const parts = params.value.split(/<br\s*\/?>/i);
          let selectedPart = parts[1];
          if (parts.length === 3) {
            selectedPart = parts[2];
          }
          return selectedPart.replace(/[()]/g, '');
        }
      },
      { 
        field: 'categories', 
        headerName: 'Category', 
        width: 250,
        cellRenderer: (params) => {
          if (!params.value) return '';
          
          const allowedCategories = ['ILP', 'NSA', 'Marriage Preparation Programme', 'Talks And Seminar'];
          
          const extractMainCategory = (cat) => {
            const name = typeof cat === 'string' ? cat : (cat?.name || '');
            const parts = name.split(':');
            return parts.length > 1 ? parts[1].trim() : parts[0].trim();
          };

          const categories = Array.isArray(params.value) ? params.value : [params.value];
          const filtered = categories
            .map(extractMainCategory)
            .filter(cat => allowedCategories.includes(cat));
          
          return [...new Set(filtered)].join(', ');
        }
      },
      { 
        field: 'shortenedUrl', 
        headerName: 'Shortened URL', 
        width: 250,
        cellRenderer: (params) => {
          const handleDoubleClick = () => {
            window.open(params.value, '_blank');
          };
          return (
            <input 
              type="text"
              value={params.value}
              readOnly
              onDoubleClick={handleDoubleClick}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                cursor: 'text',
                color: '#0066cc',
                textDecoration: 'underline',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}
              title="Double-click to open | Select and copy with Ctrl+A, Ctrl+C"
            />
          );
        }
      }
    ];

    return (
      <div className="course-link-container">
        <h1 className="course-link-title">Courses Links</h1>
          <button 
            onClick={this.exportToExcel}
            className="export-excel-btn"
          >
           Archive Data
          </button>
          <div className="ag-theme-quartz" style={{ height: 600, width: '100%' }}>
            <AgGridReact
              columnDefs={columnDefs}
              rowData={courseLinks}
              pagination={true}
              paginationPageSize={courseLinks.length}
              getRowStyle={this.getRowStyle}
            />
          </div>
      </div>
    );
  }
}

export default CourseLink;
