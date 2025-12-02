import React, { Component } from 'react';
import '../../../css/sub/CourseLink.css';

class CourseLink extends Component {
  constructor(props) {
    super(props);
    this.state = {
      courseLinks: [],
    };
  }

  componentDidMount() {
    this.props.closePopup1();
  }

  render() {
    const { courseLinks, isLoading, error } = this.state;

    return (
      <div className="course-link-container">
        <h1 className="course-link-title">Course Links</h1>
      </div>
    );
  }
}

export default CourseLink;
