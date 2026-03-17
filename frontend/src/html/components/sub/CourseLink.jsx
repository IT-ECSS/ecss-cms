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
      error: null,
        // New filter state
      searchQuery: '',
      selectedLocation: 'All Locations',
      selectedCategory: 'All Categories',
      filteredCourseLinks: [],
      filteredLocations: ['All Locations'],
      filteredCategories: ['All Categories'],
      showLocationDropdown: false,
      showCategoryDropdown: false,
      language: 'en',
      // Store site locations for filtering
      siteLocations: []
    };
    this.locationDropdownRef = React.createRef();
    this.categoryDropdownRef = React.createRef();
  }

  componentDidMount = async() => {
    console.log("CourseLink mounted with siteArray:", this.props.siteArray);
    await this.fetchCourses("");
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentDidUpdate(prevProps) {
    // Update filters when props change from homePage
    if (this.props.courseLinkSearchQuery !== prevProps.courseLinkSearchQuery) {
      this.setState({ searchQuery: this.props.courseLinkSearchQuery || '' }, this.applyFilters);
    }
    if (this.props.courseLinkLocation !== prevProps.courseLinkLocation) {
      this.setState({ selectedLocation: this.props.courseLinkLocation || 'All Locations' }, this.applyFilters);
    }
    if (this.props.courseLinkCategory !== prevProps.courseLinkCategory) {
      this.setState({ selectedCategory: this.props.courseLinkCategory || 'All Categories' }, this.applyFilters);
    }
    // Re-fetch when site changes
    if (this.props.siteArray !== prevProps.siteArray) {
      console.log("siteArray changed from", prevProps.siteArray, "to", this.props.siteArray);
      this.fetchCourses("");
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (event) => {
    if (
      this.locationDropdownRef.current &&
      !this.locationDropdownRef.current.contains(event.target)
    ) {
      this.setState({ showLocationDropdown: false });
    }
    if (
      this.categoryDropdownRef.current &&
      !this.categoryDropdownRef.current.contains(event.target)
    ) {
      this.setState({ showCategoryDropdown: false });
    }
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

  handleSearchChange = (event) => {
    const searchQuery = event.target.value;
    this.setState({ searchQuery }, this.applyFilters);
  }

  handleDropdownToggle = (dropdown) => {
    if (dropdown === 'location') {
      this.setState(prevState => ({
        showLocationDropdown: !prevState.showLocationDropdown,
        showCategoryDropdown: false
      }));
    } else if (dropdown === 'category') {
      this.setState(prevState => ({
        showCategoryDropdown: !prevState.showCategoryDropdown,
        showLocationDropdown: false
      }));
    }
  }

  handleLocationChange = (location) => {
    this.setState({ 
      selectedLocation: location,
      showLocationDropdown: false 
    }, this.applyFilters);
  }

  handleCategoryChange = (category) => {
    this.setState({ 
      selectedCategory: category,
      showCategoryDropdown: false 
    }, this.applyFilters);
  }

  getFilteredCategories = () => {
    const { role } = this.props;
    // If role is NSA in-charge, only show NSA
    if (role === 'NSA in-charge') {
      return ['NSA'];
    }
    // If role is Site in-charge or Ops in-charge, only show NSA, ILP, and Talks And Seminar
    if (role === 'Site in-charge' || role === 'Ops in-charge') {
      return ['NSA', 'ILP', 'Talks And Seminar'];
    }
    // If role is Social Worker, only show Marriage Preparation Programme and Talks And Seminar
    if (role === 'Social Worker') {
      return ['Marriage Preparation Programme', 'Talks And Seminar'];
    }
    // Default categories for other roles
    return ['ILP', 'NSA', 'Marriage Preparation Programme', 'Talks And Seminar'];
  }

  applyFilters = () => {
    const { courseLinks, searchQuery, selectedLocation, selectedCategory } = this.state;
    const { role, siteIC } = this.props;
    const siteNames = (siteIC && siteIC.length > 0) ? siteIC.filter(site => typeof site === 'string' && site.trim() !== '') : [];
    const allowedCategories = this.getFilteredCategories();

    const extractMainCategory = (cat) => {
      const name = typeof cat === 'string' ? cat : (cat?.name || '');
      const parts = name.split(':');
      return parts.length > 1 ? parts[1].trim() : parts[0].trim();
    };

    let filtered = courseLinks.filter(link => {
      const parts = link.name.split(/<br\s*\/?>/i);
      let courseName = parts[0];
      let location = parts[1] || '';
      
      if (parts.length === 3) {
        courseName = parts[1];
        location = parts[2];
      }
      
      location = typeof location === 'string' ? location.replace(/[()]/g, '').trim() : '';
      courseName = typeof courseName === 'string' ? courseName.replace(/[()]/g, '') : '';

      // Search filter
      const matchesSearch = !searchQuery || 
        courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation = selectedLocation === 'All Locations' || location === selectedLocation;

      // For Site in-charge, filter out entries that don't match their site location
      if (role === 'Site in-charge' && siteNames && siteNames.length > 0) {
        const isAtOwnSite = siteNames.includes(location);
        if (!isAtOwnSite) {
          return false;
        }
      }

      // Category filter - only show courses with allowed categories
      let matchesCategory = selectedCategory === 'All Categories';
      if (!matchesCategory && link.categories) {
        const categories = Array.isArray(link.categories) ? link.categories : [link.categories];
        const extracted = categories.map(extractMainCategory);
        const filtered = extracted.filter(cat => allowedCategories.includes(cat));
        matchesCategory = filtered.includes(selectedCategory);
      } else if (selectedCategory === 'All Categories' && link.categories) {
        // For "All Categories", only show if course has at least one allowed category
        const categories = Array.isArray(link.categories) ? link.categories : [link.categories];
        const extracted = categories.map(extractMainCategory);
        const filtered = extracted.filter(cat => allowedCategories.includes(cat));
        matchesCategory = filtered.length > 0;
      }

      return matchesSearch && matchesLocation && matchesCategory;
    });

    this.setState({ filteredCourseLinks: filtered });
  }

  passSearchedValueToParent = (searchValue) => {
    this.setState({ searchQuery: searchValue }, this.applyFilters);
  }

  passSelectedValueToParent = (updateState, dropdown) => {
    if (dropdown === 'showLocationDropdown') {
      this.setState({ 
        selectedLocation: updateState.centreLocation || 'All Locations',
        showLocationDropdown: false
      }, this.applyFilters);
    } else if (dropdown === 'showCategoryDropdown') {
      this.setState({ 
        selectedCategory: updateState.category || 'All Categories',
        showCategoryDropdown: false
      }, this.applyFilters);
    } else if (dropdown === 'clearFilters') {
      this.setState({
        searchQuery: '',
        selectedLocation: 'All Locations',
        selectedCategory: 'All Categories'
      }, this.applyFilters);
    }
  }

  exportToExcel = async () => {
    const { courseLinks } = this.state;
    
    try {
      const workbook = new ExcelJS.Workbook();
      const categories = this.getFilteredCategories();
      const categoryColorMap = {
        'NSA': 'FFD4F1D4',           // Soft pastel green
        'ILP': 'FFFFD4D4',           // Soft pastel red
        'Marriage Preparation Programme': 'FFFFFD4', // Soft pastel yellow
        'Talks And Seminar': 'FFD4E8FF'  // Soft pastel blue
      };

      // Helper function to extract and filter categories (same as table)
      const extractFilteredCategories = (categoryValue) => {
        const allowedCategories = this.getFilteredCategories();
        
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
          
          location = typeof location === 'string' ? location.replace(/[()]/g, '') : '';
          courseName = typeof courseName === 'string' ? courseName.replace(/[()]/g, '') : '';

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
      console.log("Fetching courses with courseType:", courseType);
      this.setState({ loading: true });
      var response = await axios.post(`${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/courses/`, { courseType });
      var courses = response.data.courses;

      console.log("Courses from API:", courses);
      
      // Get site names early for filtering
      const { siteIC, role } = this.props;
      const siteNames = (siteIC && siteIC.length > 0) ? siteIC.filter(site => typeof site === 'string' && site.trim() !== '') : [];
      console.log("Received siteIC prop:", siteIC);
      console.log("Site Names extracted:", siteNames);
      
      // Filter courses by centre location right after API response
      courses = courses.filter(course => {
        // Filter by site location if any siteNames exist
        if (siteNames && siteNames.length > 0) {
          const parts = course.name.split(/<br\s*\/?>/i);
          let location = parts[1] || '';
          if (parts.length === 3) {
            location = parts[2];
          }
          location = typeof location === 'string' ? location.replace(/[()]/g, '').trim() : '';
          
          // Check if location matches ANY of the site names
          const matches = siteNames.includes(location);
          if (!matches) {
            console.log(`Filtering out course: ${parts[0]} at location "${location}" (looking for any of "${siteNames.join(', ')}")`);
          }
          return matches;
        }
        
        return true;
      });
      
      console.log(`Filtered courses count (after site filter): ${courses.length}`);

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

      // Extract unique locations and categories from filtered site courses
      const uniqueLocations = ['All Locations'];
      const uniqueCategories = ['All Categories'];
      const allowedCategories = this.getFilteredCategories();

      const extractMainCategory = (cat) => {
        const name = typeof cat === 'string' ? cat : (cat?.name || '');
        const parts = name.split(':');
        return parts.length > 1 ? parts[1].trim() : parts[0].trim();
      };

      courseLinks.forEach(link => {
        // Extract location from name
        const parts = link.name.split(/<br\s*\/?>/i);
        if (parts.length >= 2) {
          let location = parts[1];
          if (parts.length === 3) {
            location = parts[2];
          }
          location = typeof location === 'string' ? location.replace(/[()]/g, '').trim() : '';
          if (location && !uniqueLocations.includes(location)) {
            uniqueLocations.push(location);
          }
        }

        // Extract categories
        if (link.categories) {
          const categories = Array.isArray(link.categories) ? link.categories : [link.categories];
          categories.forEach(cat => {
            const mainCat = extractMainCategory(cat);
            if (allowedCategories.includes(mainCat) && !uniqueCategories.includes(mainCat)) {
              uniqueCategories.push(mainCat);
            }
          });
        }
      });

      // Update state with fetched data and apply initial filters
      console.log("Available Locations:", uniqueLocations);
      console.log("Available Categories:", uniqueCategories);
      console.log("Site Courses Count:", courseLinks.length);
      this.setState({
        courseLinks: courseLinks,
        filteredCourseLinks: courseLinks,
        filteredLocations: uniqueLocations,
        filteredCategories: uniqueCategories,
        siteLocations: uniqueLocations,
        selectedLocation: 'All Locations',
        loading: false
      }, () => {
        // Apply filters to show courses
        this.applyFilters();
        // Notify parent of available filters
        if (this.props.onFiltersLoaded) {
          this.props.onFiltersLoaded(uniqueLocations, uniqueCategories);
        }
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

    const allowedCategories = this.getFilteredCategories();
    const categories = Array.isArray(params.data.categories) ? params.data.categories : [params.data.categories];
    const extracted = categories.map(extractMainCategory);
    
    // Filter to allowed categories and find first matching category color
    const filtered = extracted.filter(cat => allowedCategories.includes(cat));
    for (const cat of filtered) {
      if (categoryColorMap[cat]) {
        return { backgroundColor: categoryColorMap[cat] };
      }
    }
    
    return {};
  }


  render() {
    const { loading, courseLinks, filteredCourseLinks, searchQuery, selectedLocation, selectedCategory, filteredLocations, filteredCategories, showLocationDropdown, showCategoryDropdown } = this.state;

    const columnDefs = [
      { field: 'sn', headerName: 'S/N', width: 100 },
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
          return typeof selectedPart === 'string' ? selectedPart.replace(/[()]/g, '') : '';
        }
      },
      { 
        field: 'name', 
        headerName: 'Centre Location', 
        width: 250,
        cellRenderer: (params) => {
          const parts = params.value.split(/<br\s*\/?>/i);
          let selectedPart = parts[1];
          if (parts.length === 3) {
            selectedPart = parts[2];
          }
          return typeof selectedPart === 'string' ? selectedPart.replace(/[()]/g, '') : '';
        }
      },
      { 
        field: 'name', 
        headerName: 'Category', 
        width: 250,
        cellRenderer: (params) => {
          const categoriesValue = params.data.categories;
          
          if (!categoriesValue) return '';
          
          const allowedCategories = this.getFilteredCategories();
          
          // Extract categories
          const extractMainCategory = (cat) => {
            const name = typeof cat === 'string' ? cat : (cat?.name || '');
            const catParts = name.split(':');
            return catParts.length > 1 ? catParts[1].trim() : catParts[0].trim();
          };

          const categories = Array.isArray(categoriesValue) ? categoriesValue : [categoriesValue];
          const extracted = categories.map(extractMainCategory);
          
          // Filter to only allowed categories and get first unique one
          const filtered = extracted.filter(cat => allowedCategories.includes(cat));
          return filtered.length > 0 ? filtered[0] : '';
        }
      },
      { 
        field: 'shortenedUrl', 
        headerName: 'Shortened URL', 
        width: 300,
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
      <div className="course-link-container" style={{ marginTop: "-2%" }}>
        <h1 className="course-link-title">Courses Links</h1>
        
        {/* Instructions Section */}
        <div style={{
          backgroundColor: '#f0f7ff',
          border: '2px solid #2196F3',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '20px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <h3 style={{ marginTop: '0', color: '#1976D2', fontSize: '16px' }}>📖 How to Use Course Links</h3>
          <ul style={{ marginLeft: '20px', color: '#333' }}>
            <li><strong>Access a Link:</strong> Double-click on the URL in the "Shortened URL" column to open it in a new window</li>
            <li><strong>Copy a Link:</strong> Need to drag on the URL in the "Shortened URL" column and use Ctrl+C (Cmd+C on Mac) to copy it </li>
          </ul>
        </div>
        
        {/* Archive Data Button */}
        <div style={{ marginBottom: '15px', marginTop: '15px' }}>
          <button 
            onClick={this.exportToExcel}
            className="export-excel-btn"
            style={{ 
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '##4CAF50',
              border: '2px solid ##4CAF50',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            Archive Data
          </button>
        </div>

        {/* Data Table */}
        <div className="ag-theme-quartz" style={{ height: 600, width: '100%' }}>
          <AgGridReact
            columnDefs={columnDefs}
            rowData={filteredCourseLinks}
            pagination={true}
            paginationPageSize={Math.max(10, filteredCourseLinks.length)}
            getRowStyle={this.getRowStyle}
          />
        </div>
      </div>
    );
  }
}

export default CourseLink;
