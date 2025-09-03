import React, { Component } from "react";

class FitnessSection extends Component {
  componentDidMount() {
    // Close the loading popup when component mounts
    if (this.props.closePopup1) {
      this.props.closePopup1();
    }
  }

  render() {
    return (
      <div className="fitness-section">
        {/* Empty fitness section - content to be added later */}
      </div>
    );
  }
}

export default FitnessSection;
