import React, { Component } from "react";
import axios from "axios";
import "../../css/courseSelectionPage.css";
import CoursesList from "../components/sub/coursePage/coursesList"; // Import CoursesList component
import AddToCartBar from "../components/sub/coursePage/addToCartBar"; // Import CartBar component
import CartPopup from "../components/sub/coursePage/cartPopup"; // Import CartPopup component
import LeftBar from "../components/sub/coursePage/leftBar"; 
import MoreInfoPopup from "../components/sub/coursePage/moreInfoPopup";

class CourseSelectionPage extends Component {
  state = {
    courses: [],
    loading: true,
    error: null,
    cartItemCount: 0, // Store the number of items in the cart
    cartItems: [], // Store the selected courses in the cart
    showCartPopup: false, // Control the visibility of the cart popup
    filters: { languages: [], locations: [] }, // Modify filters structure to have languages and locations separately
    filteredCourses: [], // Store filtered courses
    showPopup: false,
    selectedCourse: {}
  };

  componentDidMount = async () => {
    await this.fetchCourses();
  };

  fetchCourses = async () => {
    try {
      var courseType = "NSA";
      var response = await axios.post(
        `${window.location.hostname === "localhost" ? "http://localhost:3002" : "https://ecss-backend-django.azurewebsites.net"}/courses/`,
        { courseType }
      );

      console.log("Response Data:", response.data); // Debugging API response
      if (response.data && response.data.courses) {
        this.setState({ courses: response.data.courses, loading: false, filteredCourses: response.data.courses });
        await this.fetchFilters(response.data.courses);
      } else {
        this.setState({ error: "No courses found", loading: false });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      this.setState({ error: "Failed to fetch courses", loading: false });
    }
  };

  fetchFilters = async (courses) => {
    try {
      // Use Sets to store unique languages and locations, including 'All' options by default
      const languagesSet = new Set(["All Languages"]);
      const locationsSet = new Set(["All Locations"]);
      const typeSet = new Set(["All Types"]);
  
      // Iterate over courses and extract unique values for language and location
      courses.forEach(course => {
        // Add language and location to the Sets (ensuring uniqueness)
        if (course.attributes[0]?.options[0]) {
          languagesSet.add(course.attributes[0].options[0]);
        }
        if (course.attributes[1]?.options[0]) {
          locationsSet.add(course.attributes[1].options[0]);
        }
        if (course.categories[1].name) {
          typeSet.add(course.categories[1].name);
        }
      });
  
      // Convert Sets to arrays for easy use in state
      const languages = Array.from(languagesSet);
      const locations = Array.from(locationsSet);
      const types = Array.from(typeSet);
  
      // Update state with the unique filters
      this.setState({
        filters: { languages, locations, types }
      });
  
      console.log("Unique Languages:", languages);
      console.log("Unique Locations:", locations);
    } catch (error) {
      console.error("Error fetching filters:", error);
      this.setState({ error: "Failed to fetch filters" });
    }
  };  

  // Handle the filtered courses and update state
  handleFilterChange = (filteredCourses) => {
    this.setState({ filteredCourses });
  };

  
  addToCartWithQuantity = (course, quantity) => {
    console.log("Add To Cart with Quantity:", course, quantity);
    this.setState((prevState) => {
      // Check if item already exists in cart
      const existingItemIndex = prevState.cartItems.findIndex(item => item.course.id === course.id);
      
      if (existingItemIndex !== -1) {
        // Item exists
        if (quantity === 0) {
          // Remove item from cart if quantity is 0
          const updatedCartItems = prevState.cartItems.filter((item, index) => index !== existingItemIndex);
          const newCartItemCount = updatedCartItems.reduce((total, item) => total + item.quantity, 0);
          
          return {
            cartItemCount: newCartItemCount,
            cartItems: updatedCartItems
          };
        } else {
          // Update quantity
          const updatedCartItems = [...prevState.cartItems];
          updatedCartItems[existingItemIndex] = {
            ...updatedCartItems[existingItemIndex],
            quantity: quantity
          };
          
          const newCartItemCount = updatedCartItems.reduce((total, item) => total + item.quantity, 0);
          
          return {
            cartItemCount: newCartItemCount,
            cartItems: updatedCartItems
          };
        }
      } else {
        // Item doesn't exist, only add if quantity > 0
        if (quantity > 0) {
          const newItem = {
            imageUrl: course.images[0].src,
            name: course.name,
            price: course.price,
            course: course,
            quantity: quantity
          };
          
          const updatedCartItems = [...prevState.cartItems, newItem];
          const newCartItemCount = updatedCartItems.reduce((total, item) => total + item.quantity, 0);
          
          return {
            cartItemCount: newCartItemCount,
            cartItems: updatedCartItems
          };
        }
        // If quantity is 0 and item doesn't exist, do nothing
        return prevState;
      }
    });
  };

  addToCart = (course) => {
    console.log("Add To Cart:", course);
    this.setState((prevState) => {
      // Check if item already exists in cart
      const existingItemIndex = prevState.cartItems.findIndex(item => item.course.id === course.id);
      
      if (existingItemIndex !== -1) {
        // Item exists, increase quantity
        const updatedCartItems = [...prevState.cartItems];
        updatedCartItems[existingItemIndex] = {
          ...updatedCartItems[existingItemIndex],
          quantity: (updatedCartItems[existingItemIndex].quantity || 1) + 1
        };
        
        return {
          cartItemCount: prevState.cartItemCount + 1,
          cartItems: updatedCartItems
        };
      } else {
        // Item doesn't exist, add new item
        return {
          cartItemCount: prevState.cartItemCount + 1,
          cartItems: [
            ...prevState.cartItems,
            {
              imageUrl: course.images[0].src,  // assuming the course object contains this
              name: course.name,
              price: course.price,
              course: course,
              quantity: 1
            },
          ]
        };
      }
    });
  };

  // Handle cart updates from the popup
  updateCartItems = (updatedCartItems) => {
    // Calculate total item count
    const cartItemCount = updatedCartItems.reduce((total, item) => total + item.quantity, 0);
    
    this.setState({
      cartItems: updatedCartItems,
      cartItemCount: cartItemCount
    });
  };

  showMoreInfo = (course) => {
    this.setState({
      showPopup: true,
      selectedCourse: course
    });
  };

  handleCartClick = () => {
    console.log("Toggling Cart Popup...");
    this.setState((prevState) => ({
      showCartPopup: !prevState.showCartPopup,
    }));
  };

  closePopup = () => {
    console.log("Toggling Cart Popup...");
    this.setState((prevState) => ({
      showPopup: !prevState.showPopup,
    }));
  };


  renderCourseName(courseName) {
    const parts = courseName.split(/<br\s*\/?>/); // Split by line breaks if they exist
    return parts.map((part, index, arr) => {
      if (index === parts.length-1) {
        // If it's the last part of a 3-part name, remove first and last char
        part = part.slice(1, -1);
      }
      return (
        <p className="course-name" key={index}>
          {part.trim()}
        </p>
      );
    });
  }

  renderCourseName1(courseName) {
    const parts = courseName.split(/<br\s*\/?>/); // Split by line breaks if they exist
    return parts.map((part, index, arr) => {
      if (index === parts.length-1) {
        // If it's the last part of a 3-part name, remove first and last char
        part = part.slice(1, -1);
      }
      return (
        <p className="cart-item-name">
          {part.trim()}
        </p>
      );
    });
  }

  
  renderCourseName2(courseName) {
    const parts = courseName.split(/<br\s*\/?>/); // Split by line breaks if they exist
    return parts.map((part, index, arr) => {
      if (index === parts.length-1) {
        // If it's the last part of a 3-part name, remove first and last char
        part = part.slice(1, -1);
      }
      return (
        <h3 className="info-item-name">
          {part.trim()}
        </h3>
      );
    });
  }

  renderDescription = (longdescription) => 
  {
    console.log("Long Description:", longdescription);
    const description = longdescription
        .replace(/<\/?b>/g, '')            // Remove <b> and </b> tags
        .replace(/<br\s*\/?>/g, '\n')      // Replace <br/> or <br /> with newline for line breaks
        .split(/<\/?p>/)                   // Split by <p> and </p> tags
        .filter(Boolean)                   // Remove empty strings from the result
        .slice(2)                          // Skip the first two items
        .map(item => `<p>${item}</p>`)      // Wrap each item in a <p> tag
        .join('');                         // Join all items back into a string

    return (
        <div>
            <div dangerouslySetInnerHTML={{ __html: description }} />
        </div>
    );
}

  renderCourseDetails = (shortDescription)  => {
    // First, clean the shortDescription by removing <br/>, <p> tags and the specific <div> tag
    let processedDescription = shortDescription
        .replace(/<br\/>/g, '') // Remove <br/>
        .replace(/<p>/g, '') // Remove <p> tag
        .replace(/<\/p>/g, '') // Remove closing </p> tag
        .replace(/<div class="nta_wa_button"[^>]*>.*?<\/div>/g, ''); // Remove the specific <div> tag
    
    // Now, remove any extra white spaces
    processedDescription = processedDescription.replace(/\s+/g, ' ').trim();
    console.log("Processed Description:", processedDescription);

    // Find the phone number after the label "联系电话" or "Contact Number:"
    const contactNumberMatch = processedDescription.match(/(?:联系电话 Contact Number:)[^\d]*(\d{4}[\s\-]?\d{4})(?:\s?\((Whatsapp only)\))?/i);
    let contactNumber = "";
    console.log("Contact Number Match:", contactNumberMatch);
    if (contactNumberMatch) {
        const phoneNumber = contactNumberMatch[1].trim(); // The phone number
        const whatsappNote = contactNumberMatch[2] ? "(Whatsapp only)" : ""; // The "(Whatsapp only)" text if it exists
    
        // Combine phone number with whatsapp note (if available)
        contactNumber = whatsappNote ? phoneNumber + " " + whatsappNote : phoneNumber;
    }

    const languageMatch = processedDescription.match(/语言 Language:<\/b><br \/>(.*?)<br \/>(.*?)<b>/i);

    // If both Chinese and English content are found, extract them
    let languages = [];
    if (languageMatch) {
        const chineseLanguage = languageMatch[1].trim(); // Extract Chinese content
        const englishLanguage = languageMatch[2].trim(); // Extract English content
        languages = [chineseLanguage, englishLanguage];
    }

    const locationMatch = processedDescription.match(/地点 Location:<\/b>(.*?)<b>/is);
    let location = "";
    if (locationMatch) {
        location = locationMatch[1].replace(/<br\s*\/?>/g, ' ').trim(); // Replace <br/> with space and trim
    }
  
    const flvMatch = processedDescription.match(/学费\/课数\/名额 Fee\/Lesson\/Vacancy：<\/b>(.*?)<b>/is);

    let feeLessonVacancyText = "";
    let feeLessonVacancy = {};
    if (flvMatch) {
        let englishFeeLessonVacancy = '';
        let mandarinFeeLessonVacancy = '';

        feeLessonVacancyText = flvMatch[1].replace(/<br\s*\/?>/g, ' ').trim(); // Remove <br/> and trim spaces
        const englishRegex = /\$?([\d\.]+)\/(\d+)\s*?Lesson(?:s)?\/(\d+)\s*?Vacanc(?:y|ies)/i;;
        // Match the English part
        const englishMatch = feeLessonVacancyText.match(englishRegex);
        console.log("English Fee:", englishMatch);
        
        if (englishMatch) {
            englishFeeLessonVacancy = englishMatch[0].trim();  // Extract the whole English schedule (day + time)
        }

        // Regular expression to match Chinese weekday and time format
        const mandarinRegex = /\$([\d\.]+)\s*\/\s*(\d+)\s?堂课\s*\/\s*(\d+)\s?名额/;

        // Match the Chinese part
        const mandarinMatch = feeLessonVacancyText.match(mandarinRegex);

        if (mandarinMatch) {
            mandarinFeeLessonVacancy = mandarinMatch[0].trim();  // Extract the whole Chinese schedule (day + time)
        }
        console.log("Mandarin Fee:",  mandarinMatch);
        feeLessonVacancy = <div style={{ whiteSpace: 'pre-line' }}>
        {englishFeeLessonVacancy} <br />
        {mandarinFeeLessonVacancy}
    </div>  
    }   

    const lessonScheduleMatch = processedDescription.match(/课程表 Lesson Schedule:<\/b>(.*?)<strong>/is);
    let lessonSchedule = "";

    if (lessonScheduleMatch) 
    {
        const lessonScheduleText = lessonScheduleMatch[1].replace(/<br\s*\/?>/g, ' ').trim();

        // Match the lesson schedule
        const englishRegex = /(Every\s*)?([A-Za-z]+(?:day)?)\s*,\s*(\d{1,2}:\d{2}[apm]{2}\s*[-–]?\s*\d{1,2}:\d{2}[apm]{2})/;

        // Match the English part
        const englishMatch = lessonScheduleText.match(englishRegex);

        let englishSchedule = '';

        if (englishMatch) {
            englishSchedule = englishMatch[0].trim();  // Extract the whole English schedule (day + time)
        }

        console.log("English Schedule:", englishSchedule);

        // Regular expression to match Chinese weekday and time format
        const mandarinRegex = /(每个\s*)?(星期一|星期二|星期三|星期四|星期五|星期六|星期日),\s*(上午|下午|中午)\d{1,2}点(\d{1,2}分)?到(上午|下午|中午)\d{1,2}点(\d{1,2}分)?/;
        // Match the Chinese part
        const mandarinMatch = lessonScheduleText.match(mandarinRegex);

        let mandarinSchedule = '';

        if (mandarinMatch) {
            mandarinSchedule = mandarinMatch[0].trim();  // Extract the whole Chinese schedule (day + time)
        }

        console.log("Mandarin Schedule:", mandarinSchedule);

        lessonSchedule = <div style={{ whiteSpace: 'pre-line' }}>
                        {mandarinSchedule} <br />
                        {englishSchedule}
                    </div>  
    }

    // Match both Chinese and English Start Date
    const startDateMatch = processedDescription.match(/开课日期 Start Date:<\/strong><br\s*\/?>\s*(.*?)<br\s*\/?>\s*(\d{1,2} [A-Za-z]+ \d{4})/is);

    // Match both Chinese and English End Date
    const endDateMatch = processedDescription.match(/课完日期 End Date:<\/strong><br\s*\/?>\s*(.*?)<br\s*\/?>\s*(\d{1,2} [A-Za-z]+ \d{4})/is);

    let courseDateRange = "";

    if (startDateMatch && endDateMatch) {
        const startDateCN = startDateMatch[1].trim(); // Chinese Start Date
        const startDateEN = startDateMatch[2].trim(); // English Start Date
        const endDateCN = endDateMatch[1].trim(); // Chinese End Date
        const endDateEN = endDateMatch[2].trim(); // English End Date
    
        // Using \n for console output (for debugging)
        console.log(`${startDateCN} - ${endDateCN}\n${startDateEN} - ${endDateEN}`);
    
        // Using <br /> for HTML output (for displaying in React/HTML)
        courseDateRange = <div style={{ whiteSpace: 'pre-line' }}>
                        {startDateCN} - {endDateCN} <br />
                        {startDateEN} - {endDateEN}
                    </div>
    }        

    return {contactNumber, language:languages[0].trim()+" "+languages[1].trim(), location, feeLessonVacancy, lessonSchedule, courseDateRange};
  }

  handleCheckout = (coursesRegistered) =>
  {
    console.log("Registered Courses:", coursesRegistered);
  }

  render() {
    const { courses, filteredCourses, loading, error, cartItemCount, cartItems, showCartPopup, filters, showPopup, selectedCourse } = this.state;

    if (loading) return <p>Loading courses...</p>;
    if (error) return <p>{error}</p>;

    return (
      <div className="course-selection-page">
        {/* Cart Bar */}
        <AddToCartBar cartItemCount={cartItemCount} onCartClick={this.handleCartClick}/>

        {/* Left Sidebar for Filtering */}
        <div className="main-container">
          {/* Left Sidebar for Filtering */}
          <LeftBar
            courses={courses} 
            filters={filters}  // Pass the list of filters to the sidebar
            onFilterChange={this.handleFilterChange} // Pass the filter change handler
          />

          {/* Course List */}
          <CoursesList
            courses={filteredCourses}  // Use filtered courses
            addToCart={this.addToCart}
            addToCartWithQuantity={this.addToCartWithQuantity}
            showMoreInfo={this.showMoreInfo}
            renderCourseName={this.renderCourseName}
            cartItems={cartItems}
          />
        </div>

        {/* Cart Popup */}
        {showCartPopup && (
          <CartPopup 
            cartItems={cartItems} 
            onClose={this.handleCartClick}
            onCartUpdate={this.updateCartItems}
            renderCourseName1={this.renderCourseName1}
            handleCheckout={this.handleCheckout}
          />
        )}

        {showPopup && selectedCourse && (
          <MoreInfoPopup 
            selectedCourse={selectedCourse} 
            renderCourseName2={this.renderCourseName2}  
            renderDescription={this.renderDescription} 
            renderCourseDetails={this.renderCourseDetails} 
            handleClose={this.closePopup} 
            handleAddToCart={this.addToCart}
            handleAddToCartWithQuantity={this.addToCartWithQuantity}
            cartItems={cartItems}
          />
        )}
      </div>
    );
  }
}

export default CourseSelectionPage;
