import React, { Component } from 'react';
import '../../../../css/sub/registrationForm/personalInfo.css'; // Reuse the same CSS styles

class SpouseInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showOthersSpecify: false // Track if "Others" is selected for how they found out about the programme
    };
  }

  // Handle changes for spouse fields
  handleChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;

    // Format spouse NRIC similar to personal NRIC formatting
    if (name === "spouseNRIC") {
      // Remove any spaces
      formattedValue = formattedValue.trim();

      // Capitalize first and last letters if present
      if (formattedValue.length >= 2) {
        const first = formattedValue.charAt(0).toUpperCase();
        const middle = formattedValue.slice(1, -1);
        const last = formattedValue.charAt(formattedValue.length - 1).toUpperCase();
        formattedValue = first + middle + last;
      } else if (formattedValue.length === 1) {
        formattedValue = formattedValue.toUpperCase();
      }
    }

    // Format spouse name similar to personal name formatting
    if (name === "spouseName") {
      // Format name: capitalize first letter of each word, lowercase the rest
      formattedValue = value
        .toLowerCase() // Convert entire string to lowercase first
        .split(' ') // Split by spaces
        .map(word => {
          // Capitalize first letter of each word, keep rest lowercase
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' '); // Join back with spaces
    }

    // Handle "Others" selection for how they found out about the programme
    if (name === "howFoundOut") {
      if (value === "Others, please specify") {
        this.setState({ showOthersSpecify: true });
      } else {
        this.setState({ showOthersSpecify: false });
        // Clear the "Others specify" field if a different option is selected
        this.props.onChange({ howFoundOutOthers: '' });
      }
    }

    console.log(`${name}: ${formattedValue}`);
    this.props.onChange({ [name]: formattedValue });
  };

  // Validate date format (dd/mm/yyyy)
  isValidDDMMYYYY = (dateString) => {
    // Match pattern: dd/mm/yyyy
    const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(dateString)) return false;
  
    // Extra: Validate if it's a real calendar date
    const [dd, mm, yyyy] = dateString.split('/');
    const date = new Date(`${yyyy}-${mm}-${dd}`);
    return (
      date &&
      date.getFullYear() === parseInt(yyyy, 10) &&
      date.getMonth() + 1 === parseInt(mm, 10) &&
      date.getDate() === parseInt(dd, 10)
    );
  };

  // Handle date field changes for spouse date of birth
  handleDateChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    // Remove all non-digit characters first
    value = value.replace(/\D/g, '');

    // Auto-insert slashes as needed
    if (value.length >= 3 && value.length <= 4) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    } else if (value.length > 4 && value.length <= 8) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4);
    }

    // Limit to 10 characters (dd/mm/yyyy)
    if (value.length > 10) value = value.slice(0, 10);

    // Always update the display value
    this.props.onChange({ [name]: value });

    // Log validation result
    if (this.isValidDDMMYYYY(value)) {
      console.log(`✅ Valid date for ${name}:`, value);
    } else if (value === '') {
      console.log(`Field ${name} cleared`);
    } else {
      console.log(`❌ Invalid date format for ${name}. Expected dd/mm/yyyy`);
    }
  };

  render() {
    const { data = {}, errors } = this.props;

    // Define spouse fields
    const spouseFields = [
      { name: 'spouseName', label: "Spouse's Full Name", placeholder: "Spouse's Full Name", isSelect: false, isRadio: false },
      { name: 'spouseNRIC', label: "Spouse's NRIC/FIN/Passport No.", placeholder: "Spouse's NRIC/FIN/Passport No.", isSelect: false, isRadio: false },
      { name: 'spouseDOB', label: "Spouse's Date of Birth", placeholder: "Spouse's Date of Birth", isSelect: true, isDate: true },
      { name: 'spouseResidentialStatus', label: "Spouse's Residential Status", placeholder: "Spouse's Residential Status", isSelect: true, isDropdown: true },
      { name: 'spouseSex', label: "Spouse's Sex", placeholder: "Spouse's Sex", isSelect: true, isDropdown: true },
      { name: 'spouseEthnicity', label: "Spouse's Ethnicity", placeholder: "Spouse's Ethnicity", isSelect: true, isDropdown: true },
      { name: 'spouseMaritalStatus', label: "Spouse's Marital Status", placeholder: "Spouse's Marital Status", isSelect: true, isDropdown: true },
      { name: 'spousePostalCode', label: "Spouse's Postal Code", placeholder: "Spouse's Postal Code", isSelect: false, isNumber: true },
      { name: 'spouseMobile', label: "Spouse's Mobile Number", placeholder: "Spouse's Mobile Number", isSelect: false, isPhone: true },
      { name: 'spouseEmail', label: "Spouse's Email Address", placeholder: "Spouse's Email Address", isSelect: false, isEmail: true },
      { name: 'spouseEducation', label: "Spouse's Highest Educational Attainment", placeholder: "Spouse's Highest Educational Attainment", isSelect: true, isDropdown: true },
      { name: 'spouseHousingType', label: "Spouse's Housing Type", placeholder: "Spouse's Housing Type", isSelect: true, isDropdown: true },
      { name: 'howFoundOut', label: 'How did you find out about this programme?', placeholder: 'How did you find out about this programme?', isSelect: true, isDropdown: true },
      { name: 'sourceOfReferral', label: 'Source of Referral?', placeholder: 'Source of Referral?', isSelect: true, isDropdown: true }
    ];

    // Define dropdown options
    const optionMappings = {
      spouseResidentialStatus: ['CITIZEN', 'PR', 'NOT APPLICABLE'],
      spouseSex: ['FEMALE', 'MALE'],
      spouseEthnicity: ['Chinese', 'Malay', 'Indian', 'Others'],
      spouseMaritalStatus: ['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED'],
      spouseEducation: [
        'Below Secondary',
        'Secondary',
        'Post-secondary (non-tertiary)',
        'Diploma & Professional Qualification',
        "Bachelor's Degree or Equivalent",
        'Postgraduate Diploma/Degree'
      ],
      spouseHousingType: [
        'HDB rental Flat',
        'HDB 1 & 2 room Flat',
        'HDB 3-room Flat',
        'HDB 4-room Flat',
        'HDB 5-room & Executive Flat',
        'Condominiums & Other Apartments',
        'Landed property',
        'Others'
      ],
      howFoundOut: [
        'Centre for Fathering / Dads for Life / Mums for Life',
        'E-newsletter, Email alerts, push SMS notifications',
        "Families for Life Campaigns / Events (e.g., National Family Festival, 'I Still Do' event)",
        'Families for Life Facebook',
        'Families for Life Instagram',
        'Families for Life Website',
        'Family Nexus',
        'Google Banner Advertisement',
        'Online Influencers',
        'Out-of-Home Advertisements',
        'Preschool',
        'School',
        'Social Service Agencies',
        'TV / Radio Ads',
        'Word-of-Mouth (e.g., Colleagues, Family, Friends)',
        'YouTube Advertisement',
        'Others, please specify'
      ],
      sourceOfReferral: [
        'Not Applicable',
        'Child Protective Services (CPS)',
        'ComLink+',
        'Family Service Centres (FSC)',
        'FamNex Our Tampines Hub (Tampines)',
        'FamNex Bukit Canberra (Sembawang)',
        'FamNex Punggol',
        'FamNex Choa Chu Kang',
        'FamNex Keat Hong',
        'KidSTART',
        'Social Service Offices (SSO)',
        'Strengthening Families Programme (FAM@FSC)',
        'Singapore Prison Services',
        'Youth-At-Risk Agencies (YAR)'
      ]
    };

    return (
      <div>
        <h3 style={{ marginBottom: '20px', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
          Spouse Information
        </h3>
        
        {spouseFields.map((field) => (
          <div key={field.name} className="input-group1">
            <label htmlFor={field.name}>{field.label}</label>
            {field.isDropdown ? (
              <select
                id={field.name}
                name={field.name}
                value={data[field.name] || ''}
                onChange={this.handleChange}
                className="personal-info-input"
              >
                <option value="">Select {field.label}</option>
                {optionMappings[field.name]?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.isDate ? (
              <input
                id={field.name}
                name={field.name}
                type="text"
                className="personal-info-input"
                value={data[field.name] || ''}
                placeholder="dd/mm/yyyy"
                onChange={this.handleDateChange}
                autoComplete='off'
              />
            ) : field.isNumber ? (
              <input
                type="number"
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={data[field.name] || ''}
                onChange={this.handleChange}
                className="personal-info-input1"
              />
            ) : field.isPhone ? (
              <input
                type="tel"
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={data[field.name] || ''}
                onChange={this.handleChange}
                className="personal-info-input1"
              />
            ) : field.isEmail ? (
              <input
                type="email"
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={data[field.name] || ''}
                onChange={this.handleChange}
                className="personal-info-input1"
              />
            ) : (
              <input
                type="text"
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                value={data[field.name] || ''}
                onChange={this.handleChange}
                className="personal-info-input1"
              />
            )}
            {errors[field.name] && <span className="error-message3">{errors[field.name]}</span>}
          </div>
        ))}

        {/* Conditional "Others, please specify" field */}
        {this.state.showOthersSpecify && (
          <div className="input-group1">
            <label htmlFor="howFoundOutOthers">Please specify:</label>
            <input
              type="text"
              id="howFoundOutOthers"
              name="howFoundOutOthers"
              placeholder="Please specify how you found out about this programme"
              value={data.howFoundOutOthers || ''}
              onChange={this.handleChange}
              className="personal-info-input1"
            />
            {errors.howFoundOutOthers && <span className="error-message3">{errors.howFoundOutOthers}</span>}
          </div>
        )}
      </div>
    );
  }
}

export default SpouseInfo;
