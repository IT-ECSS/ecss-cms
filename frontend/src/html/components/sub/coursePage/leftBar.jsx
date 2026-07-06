import { React, Component } from 'react';
import "../../../../css/sub/coursePage/leftBar.css"; // Import the CartPopup CSS styles here

class LeftBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLanguage: null,  // To track the selected language (null by default)
      selectedLocation: null,  // To track the selected location (null by default)
      selectedCourseType: null, // To track the selected course type (null by default)
      searchQuery: "", // Track the search input value
    };
  }

  handleFilterClick = (filterType, filterValue) => {
    console.log(`${filterType} clicked: ${filterValue}`); // Debug log

    if (filterType === 'language') {
      const newLanguage = filterValue;
      this.setState({ selectedLanguage: newLanguage }, () => {
        this.filterCourses(); // Call the filtering method after updating state
      });
    } else if (filterType === 'location') {
      const newLocation = filterValue;
      this.setState({ selectedLocation: newLocation }, () => {
        this.filterCourses(); // Call the filtering method after updating state
      });
    } else if (filterType === 'courseType') {
      const newCourseType = filterValue;
      this.setState({ selectedCourseType: newCourseType }, () => {
        this.filterCourses(); // Call the filtering method after updating state
      });
    }
  };

  // Method to handle the search input
  handleSearchChange = (event) => {
    const searchQuery = event.target.value;
    this.setState({ searchQuery }, () => {
      this.filterCourses(); // Call the filtering method after updating state
    });
  };

  filterCourses = () => {
    const { selectedLanguage, selectedLocation, selectedCourseType, searchQuery } = this.state;

    console.log('Selected:', selectedLanguage, selectedLocation, selectedCourseType, searchQuery);

    const { courses } = this.props; // Assuming courses are passed as a prop
    console.log('Courses:', courses);

    if (courses.length === 0) {
      console.log('No courses available');
      this.props.onFilterChange([]); // Pass an empty array if no courses are available
      return;
    }

    // Filter courses based on selected language, location, course type, and search query
    const filteredCourses = courses.filter(course => {
      console.log('Checking course:', course);

      // Apply the new conditions for 'All Languages', 'All Locations', and 'All Course Types'
      const isAllLanguagesSelected = selectedLanguage === null || selectedLanguage === 'All Languages';
      const isAllLocationsSelected = selectedLocation === null || selectedLocation === 'All Locations';
      const isAllCourseTypesSelected = selectedCourseType === null || selectedCourseType === 'All Types';

      // Language check: If "All Languages" is selected, skip filtering by language
      const matchesLanguage = isAllLanguagesSelected || 
        (course.attributes && course.attributes[0] && course.attributes[0].options[0] === selectedLanguage);

      // Location check: resolve the venue from the "course_location" attribute
      // (fallback "centre_location"), matching the filter dropdown values.
      const resolveLocationOption = (attrs) => {
        if (!Array.isArray(attrs)) return undefined;
        const match = (names) => attrs.find(a =>
          names.includes((a.slug || '').toLowerCase()) || names.includes((a.name || '').toLowerCase())
        );
        const attr = match(['course_location', 'pa_course_location', 'course location'])
          || match(['centre_location', 'pa_centre_location', 'centre location']);
        return attr?.options?.[0] ?? attrs[1]?.options?.[0];
      };
      const matchesLocation = isAllLocationsSelected ||
        (resolveLocationOption(course.attributes) === selectedLocation);

      // Course Type check: If "All Course Types" is selected, skip filtering by course type
      const matchesCourseType = isAllCourseTypesSelected || 
        (course.categories && course.categories[1].name === selectedCourseType);

      // Search query check: If there is a search query, check if it matches the course title or description
      const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLanguage && matchesLocation && matchesCourseType && matchesSearch; // Return true if all conditions match
    });

    console.log('Filtered Courses:', filteredCourses);

    // Pass the filtered courses to the parent component
    this.props.onFilterChange(filteredCourses);
  };

  render() {
    const { filters } = this.props;
    const { selectedLanguage, selectedLocation, selectedCourseType, searchQuery } = this.state;

    return (
      <div className="filter-sidebar">
        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for courses"
            value={searchQuery}
            onChange={this.handleSearchChange}
            className="search-bar"
          />
        </div>

        {/* Course Type Filter */}
        <div className="filter-section1">
          <h3 className="filter-heading">课程类型 Course Types</h3>
          <div className="filter-list">
            {filters.types.map((courseType, index) => (
              <div
                key={index}
                onClick={() => this.handleFilterClick('courseType', courseType)}
                className={`filter-item1 ${selectedCourseType === courseType ? 'selected' : ''}`}
              >
                 {index >= 1 ? courseType.split(":")[1].trim() : courseType}
              </div>
            ))}
          </div>
        </div>

        {/* Language Filter */}
        <div className="filter-section1">
          <h3 className="filter-heading">语言 Languages</h3>
          <div className="filter-list">
            {filters.languages.map((language, index) => (
              <div
                key={index}
                onClick={() => this.handleFilterClick('language', language)}
                className={`filter-item1 ${selectedLanguage === language ? 'selected' : ''}`}
              >
                {language}
              </div>
            ))}
          </div>
        </div>

        {/* Location Filter */}
        <div className="filter-section1">
          <h3 className="filter-heading">地点 Locations</h3>
          <div className="filter-list">
            {filters.locations.map((location, index) => (
              <div
                key={index}
                onClick={() => this.handleFilterClick('location', location)}
                className={`filter-item1 ${selectedLocation === location ? 'selected' : ''}`}
              >
                {location}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default LeftBar;
