import React, { Component } from 'react';
import { DatePicker } from "@heroui/date-picker";
import '../../../../css/sub/registrationForm/personalInfo.css'; // Custom styles
import { DayPicker, dayPickerContext } from 'react-day-picker';
import 'react-day-picker/style.css'; // Import default styles

// Custom input for the DayPicker component
const CustomInput = React.forwardRef(({ value, onClick }, ref) => (
  <input
    className="personal-info-input"
    value={value}
    onClick={onClick}
    ref={ref}
    placeholder="dd/mm/yyyy"
  />
));

class PersonalInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showCalendar: false, // Initialize the showCalendar state
      selectedDate: new Date(new Date().getFullYear() - 89, 0, 1), // Store the selected date
      manualDate: '', // Store the manual input for backspace handling
    };
  }

  // Add componentDidMount to handle pre-populated data
  componentDidMount() {
    const { data } = this.props;
    
    // Handle date of birth pre-population
    if (data && data.dOB) {
      this.setState({ manualDate: data.dOB });
      // Parse the date if it's in dd/mm/yyyy format
      if (this.isValidDDMMYYYY(data.dOB)) {
        const [dd, mm, yyyy] = data.dOB.split('/');
        const dateObj = new Date(yyyy, mm - 1, dd);
        this.setState({ selectedDate: dateObj });
      }
    }
    
    // Handle name formatting for pre-populated data
    if (data && data.pName) {
      const formattedName = data.pName
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
      // Only update if the name needs formatting
      if (formattedName !== data.pName) {
        this.props.onChange({ pName: formattedName });
      }
    }
    
    // Handle NRIC formatting for pre-populated data
    if (data && data.nRIC) {
      let formattedNRIC = data.nRIC.trim();
      if (formattedNRIC.length >= 2) {
        const first = formattedNRIC.charAt(0).toUpperCase();
        const middle = formattedNRIC.slice(1, -1);
        const last = formattedNRIC.charAt(formattedNRIC.length - 1).toUpperCase();
        formattedNRIC = first + middle + last;
      } else if (formattedNRIC.length === 1) {
        formattedNRIC = formattedNRIC.toUpperCase();
      }
    
      // Only update if the NRIC needs formatting
      if (formattedNRIC !== data.nRIC) {
        this.props.onChange({ nRIC: formattedNRIC });
      }
    }
  }

  // Add componentDidUpdate to handle when props change
  componentDidUpdate(prevProps) {
    const { data } = this.props;
    
    // Handle date of birth updates
    if (prevProps.data?.dOB !== data?.dOB && data?.dOB && data.dOB !== this.state.manualDate) {
      this.setState({ manualDate: data.dOB });
      // Parse the date if it's in dd/mm/yyyy format
      if (this.isValidDDMMYYYY(data.dOB)) {
        const [dd, mm, yyyy] = data.dOB.split('/');
        const dateObj = new Date(yyyy, mm - 1, dd);
        this.setState({ selectedDate: dateObj });
      }
    }
    
    // Handle name formatting when props change
    if (prevProps.data?.pName !== data?.pName && data?.pName) {
      const formattedName = data.pName
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    
      // Only update if the name needs formatting and is different from current data
      if (formattedName !== data.pName) {
        this.props.onChange({ pName: formattedName });
      }
    }
    
    // Handle NRIC formatting when props change
    if (prevProps.data?.nRIC !== data?.nRIC && data?.nRIC) {
      let formattedNRIC = data.nRIC.trim();
      if (formattedNRIC.length >= 2) {
        const first = formattedNRIC.charAt(0).toUpperCase();
        const middle = formattedNRIC.slice(1, -1);
        const last = formattedNRIC.charAt(formattedNRIC.length - 1).toUpperCase();
        formattedNRIC = first + middle + last;
      } else if (formattedNRIC.length === 1) {
        formattedNRIC = formattedNRIC.toUpperCase();
      }
    
      // Only update if the NRIC needs formatting and is different from current data
      if (formattedNRIC !== data.nRIC) {
        this.props.onChange({ nRIC: formattedNRIC });
      }
    }
  }

  handleChange = (e) => {
    const { name, value } = e.target;
    const { singPassPopulatedFields } = this.props;
    
    // Don't allow changes to fields populated by SingPass
    if (singPassPopulatedFields?.[name]) {
      return;
    }
    
    let formattedValue = value;

    if (name === "nRIC") {
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

    if (name === "pName") {
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

    console.log(`${name}: ${formattedValue}`);
    this.props.onChange({ [name]: formattedValue });
  };

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

  handleChange1 = (e, field) => {
    const { singPassPopulatedFields } = this.props;
    
    if (field === "DOB") {
      // Don't allow changes to DOB if it's populated by SingPass
      if (singPassPopulatedFields?.dOB) {
        return;
      }
      
      let { name, value } = e.target;
  
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
  
      // Update input value live
      this.setState({ manualDate: value });
  
      // If the auto-formatted value is valid, pass it to parent
      if (this.isValidDDMMYYYY(value)) {
        console.log("✅ Valid date:", value);
        this.props.onChange({ [name]: value });
        this.setState({ selectedDate: new Date(value.split('/').reverse().join('-')) });
      } else {
        console.warn("❌ Invalid date format. Expected dd/mm/yyyy");
      }
    }
  };

  // Handle backspace dynamically
  handleBackspace = (event) => {
    if (event.key === "Backspace") {
      const inputDate = this.state.manualDate;
      const newLength = inputDate.length - 1;

      if (newLength <= 0) {
        this.setState({ manualDate: '' });
        this.props.onChange({ dOB: '' });
      } else {
        const newValue = inputDate.substring(0, newLength);
        this.setState({ manualDate: newValue });
        this.props.onChange({ dOB: newValue });
      }
    }
  };

  handleDateChange = (date) => {
    const formattedDate = date.toLocaleDateString("en-GB"); // "dd/mm/yyyy"
    console.log("Handle Date Change:", date);
    console.log("Current Selected Date:", this.state.selectedDate)
    console.log("Year:", date.getFullYear());
  
   if (formattedDate) {
      // Format the date as dd/mm/yyyy
      const formattedDate1 = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  
      // Update the state with the selected date and formatted dates
      this.setState({ selectedDate: date, manualDate: formattedDate1 });
  
      // Pass the formatted date back to parent
      this.props.onChange({ dOB: formattedDate1 });
    } else {
      // If no date is selected, clear the date
      this.setState({ selectedDate: null, manualDate: '' });
  
      // Pass empty values to parent
      this.props.onChange({ dOB: '' });
     }
  };

  // Toggle the calendar visibility
  toggleCalendar = (e) => {
    this.setState((prevState) => ({ showCalendar: !prevState.showCalendar }));
  };

  // Close the calendar
  closeCalendar = () => {
    this.setState({ showCalendar: false });
  };

  // Handle month change
  handleMonthChange = (event) => {
    const { selectedDate } = this.state;
    const newMonth = parseInt(event, 10); // Get selected month (0-based)
    const newDate = new Date(selectedDate.getFullYear(), newMonth, selectedDate.getDate());
  
    // Format the date as dd/mm/yyyy
    const formattedDate = `${newDate.getDate().toString().padStart(2, '0')}/${(newDate.getMonth() + 1).toString().padStart(2, '0')}/${newDate.getFullYear()}`;
  
    // Update local state to reflect the new selected date
    this.setState({ selectedDate: newDate, manualDate: formattedDate});
  
    // Update the parent component with the new formatted date
    this.props.onChange({ dOB: formattedDate });
    this.setState({ showCalendar: false }); // Close calendar after selecting a date
  };

  handleYearChange = (event) => {
    const { selectedDate } = this.state;
    console.log(event);
    console.log(selectedDate);
    const newYear = parseInt(event, 10); // Get selected year
    const newDate = new Date(newYear, selectedDate.getMonth(), selectedDate.getDate());

    // Format the date as dd/mm/yyyy
    const formattedDate = `${newDate.getDate().toString().padStart(2, '0')}/${(newDate.getMonth() + 1).toString().padStart(2, '0')}/${newDate.getFullYear()}`;
    console.log(formattedDate); 
  
    // Update local state to reflect the new selected date
    this.setState({ selectedDate: newDate, manualDate: formattedDate });
  
    // Update the parent component with the new formatted date
    this.props.onChange({ dOB: formattedDate });
    this.setState({ showCalendar: false }); // Close calendar after selecting a date
  };

  // Handle date field changes for Marriage Preparation Programme
  handleDateFieldChange = (e, fieldName) => {
    const { singPassPopulatedFields } = this.props;
    
    // Don't allow changes to fields populated by SingPass
    if (singPassPopulatedFields?.[fieldName]) {
      return;
    }
    
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

    // If the auto-formatted value is valid, pass it to parent
    if (this.isValidDDMMYYYY(value)) {
      console.log(`✅ Valid date for ${fieldName}:`, value);
      this.props.onChange({ [fieldName]: value });
    } else if (value === '') {
      // Allow clearing the field
      this.props.onChange({ [fieldName]: '' });
    } else {
      // For invalid dates, still update the display but don't validate
      this.props.onChange({ [fieldName]: value });
    }
  };

  render() {
    const { data = {}, errors, singPassPopulatedFields, onClearSingPassData, hideMyInfoOptions } = this.props;

    // Check if any SingPass fields are populated (only if not Marriage Preparation Programme)
    const hasSingPassData = !hideMyInfoOptions && singPassPopulatedFields && Object.values(singPassPopulatedFields).some(field => field === true);

    // Get course type from props if available
    const courseType = this.props.data?.type;
    const isMarriagePreparation = courseType === 'Marriage Preparation Programme';

    // Define sections based on course type
    let sections;
    let optionMappings = {};

    if (isMarriagePreparation) {
      // Marriage Preparation Programme specific fields - following exact specification
      sections = [
        { name: 'pName', label: 'Full Name', placeholder: 'Full Name', isSelect: false, isRadio: false },
        { name: 'nRIC', label: 'NRIC/FIN', placeholder: 'NRIC/FIN', isSelect: false, isRadio: false },
        { name: 'dOB', label: 'Date of Birth', placeholder: 'Date of Birth', isSelect: true, isDate: true },
        { name: 'rESIDENTIALSTATUS', label: 'Residential Status', placeholder: 'Residential Status', isSelect: true, isRadio: true },
        { name: 'gENDER', label: 'Sex', placeholder: 'Sex', isSelect: true, isRadio: true },
        { name: 'rACE', label: 'Ethnicity', placeholder: 'Ethnicity', isSelect: true, isRadio: true },
        { name: 'mARITALSTATUS', label: 'Marital Status', placeholder: 'Marital Status', isSelect: true, isRadio: true },
        { name: 'postalCode', label: 'Postal Code', placeholder: 'Postal Code', isSelect: false, isRadio: false, isNumber: true },
        { name: 'cNO', label: 'Mobile Number', placeholder: 'Mobile Number', isSelect: false, isRadio: false, isPhone: true },
        { name: 'eMAIL', label: 'Email Address', placeholder: 'Email Address', isSelect: false, isRadio: false, isEmail: true },
        { name: 'eDUCATION', label: 'Highest Educational Attainment', placeholder: 'Highest Educational Attainment', isSelect: true, isRadio: true },
        { name: 'hOUSINGTYPE', label: 'Housing Type', placeholder: 'Housing Type', isSelect: true, isRadio: true },
        { name: 'gROSSMONTHLYINCOME', label: 'Gross Monthly Couple Income', placeholder: 'Gross Monthly Couple Income', isSelect: true, isRadio: true },
        { name: 'mARRIAGEDURATION', label: 'Marriage duration', placeholder: 'Marriage duration', isSelect: true, isRadio: true },
        { name: 'tYPEOFMARRIAGE', label: 'Type of Marriage', placeholder: 'Type of Marriage', isSelect: true, isRadio: true },
        { name: 'hASCHILDREN', label: 'Have child(ren) before current marriage', placeholder: 'Have child(ren) before current marriage', isSelect: true, isRadio: true }
      ];

      // Marriage Preparation Programme specific options - following exact specification
      const residentialStatusOptions = ['CITIZEN', 'PR', 'NOT APPLICABLE'];
      const genderOptions = ['FEMALE', 'MALE'];
      const ethnicityOptions = ['Chinese', 'Malay', 'Indian', 'Others'];
      const maritalStatusOptions = ['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED'];
      const educationOptions = [
        'Below Secondary',
        'Secondary',
        'Post-secondary (non-tertiary)',
        'Diploma & Professional Qualification',
        "Bachelor's Degree or Equivalent",
        'Postgraduate Diploma/Degree'
      ];
      const housingTypeOptions = [
        'HDB rental Flat',
        'HDB 1 & 2 room Flat',
        'HDB 3-room Flat',
        'HDB 4-room Flat',
        'HDB 5-room & Executive Flat',
        'Condominiums & Other Apartments',
        'Landed property',
        'Others'
      ];
      const grossIncomeOptions = [
        '$2,500 and below',
        '$2,501 to $8,500',
        '$8,501 and above'
      ];
      const marriageDurationOptions = [
        'Soon-to-wed',
        '0 to 2 years',
        'More than 2 years to 5 years',
        'More than 5 years to 10 years',
        'More than 10 years to 25 years',
        'More than 25 years'
      ];
      const typeOfMarriageOptions = [
        'This marriage is/will be a first marriage for both of us',
        'This is/will be a remarriage for either of us/both of us'
      ];
      const hasChildrenOptions = ['Yes', 'No'];

      optionMappings = {
        rESIDENTIALSTATUS: residentialStatusOptions,
        gENDER: genderOptions,
        rACE: ethnicityOptions,
        mARITALSTATUS: maritalStatusOptions,
        eDUCATION: educationOptions,
        hOUSINGTYPE: housingTypeOptions,
        gROSSMONTHLYINCOME: grossIncomeOptions,
        mARRIAGEDURATION: marriageDurationOptions,
        tYPEOFMARRIAGE: typeOfMarriageOptions,
        hASCHILDREN: hasChildrenOptions
      };
    } else {
      // Original sections for NSA/ILP courses
      sections = [
        { name: 'pName', label: 'Name 姓名', placeholder: 'Name 姓名 (As in NRIC 与身份证相符)', isSelect: false, isRadio: false },
        { name: 'nRIC', label: 'NRIC Number 身份证号码', placeholder: 'NRIC Number 身份证号码', isSelect: false, isRadio: false },
        { name: 'rESIDENTIALSTATUS', label: 'Residential Status 居民身份', placeholder: 'Residential Status 居民身份', isSelect: true, isRadio: true },
        { name: 'rACE', label: 'Race 种族', placeholder: 'Race 种族', isSelect: true, isRadio: true },
        { name: 'gENDER', label: 'Gender 性别', placeholder: 'Gender 性别', isSelect: true, isRadio: true },
        { name: 'dOB', label: 'Date of Birth 出生日期', placeholder: 'Date of Birth 出生日期', isSelect: true, isDate: true },
        { name: 'address', label: 'Address 地址', placeholder: 'Address 地址', isSelect: false, isRadio: false },
        { name: 'eDUCATION', label: 'Education Level 最高教育水平', placeholder: 'Education Level 最高教育水平', isSelect: true, isRadio: true },
        { name: 'wORKING', label: 'Work Status 工作状态', placeholder: 'Work Status 工作状态', isSelect: true, isRadio: true }
      ];

      // Original options for NSA/ILP courses
      const residentalStatusOptions = ['SC 新加坡公民', 'PR 永久居民'];
      const genderOptions = ['M 男', 'F 女'];
      const educationOptions = [
        'No Formal Education 无正规教育',
        'Primary 小学',
        'Secondary 中学',
        'Post-Secondary (Junior College/ITE) 专上教育',
        'Diploma 文凭',
        "Bachelor's Degree 学士学位",
        "Master's Degree 硕士",
        'Others 其它',
      ];
      const workingStatusOptions = [
        'Retired 退休',
        'Employed full-time 全职工作',
        'Self-employed 自雇人',
        'Part-time 兼职',
        'Unemployed 失业',
      ];
      const raceOptions = ['Chinese 华', 'Indian 印', 'Malay 马', 'Others 其他'];

      optionMappings = {
        gENDER: genderOptions,
        eDUCATION: educationOptions,
        rACE: raceOptions,
        wORKING: workingStatusOptions,
        rESIDENTIALSTATUS: residentalStatusOptions,
      };
    }

    return (
      <div>
        {/* Clear SingPass Data Button - Only show for non-Marriage Preparation Programme */}
        {hasSingPassData && !hideMyInfoOptions && (
          <div className="clear-singpass-container">
            <p className="singpass-info">
              📄 Some fields have been populated with your Singpass data and are protected from editing.
            </p>
            <button 
              type="button"
              className="clear-singpass-button"
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all Singpass data? This will empty all populated fields.')) {
                  onClearSingPassData && onClearSingPassData();
                }
              }}
            >
              🗑️ Clear Singpass Data
            </button>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.name} className="input-group1">
            <label htmlFor={section.name}>{section.label}</label>
            {section.isRadio ? (
              <div className="radio-group1">
                {optionMappings[section.name]?.map((option) => (
                  <label key={option} className="radio-option1">
                    <input
                      type="radio"
                      name={section.name}
                      value={option}
                      checked={data[section.name] === option}
                      onChange={this.handleChange}
                      onClick={this.closeCalendar}
                      disabled={singPassPopulatedFields?.[section.name]} // Disable if populated by SingPass
                    />
                    {option}
                  </label>
                ))}
              </div>
            ) : section.isSelect && !section.isRadio && !section.isDate ? (
              // Dropdown for Marriage Preparation Programme nationality fields
              <select
                id={section.name}
                name={section.name}
                value={data[section.name] || ''}
                onChange={this.handleChange}
                className={`personal-info-input ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                disabled={singPassPopulatedFields?.[section.name]}
              >
                <option value="">Select {section.label}</option>
                {optionMappings[section.name]?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : section.isSelect && section.isDate ? (
              <>
                <input
                  id={section.name}
                  name={section.name}
                  type="text"
                  className={`personal-info-input ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                  value={
                    section.name === 'dOB' ? (this.state.manualDate || data[section.name] || '') :
                    (data[section.name] || '')
                  }
                  placeholder="dd/mm/yyyy"
                  onChange={(e) => { 
                    e.stopPropagation(); 
                    if (section.name === 'dOB') {
                      this.handleChange1(e, "DOB");
                    } else {
                      this.handleDateFieldChange(e, section.name);
                    }
                  }}
                  onKeyDown={section.name === 'dOB' ? this.handleBackspace : undefined}
                  onBlur={this.closeCalendar}
                  autoComplete='off'
                  disabled={singPassPopulatedFields?.[section.name]}
                />
                <br />
              </>
            ) : section.isNumber ? (
              <input
                type="number"
                id={section.name}
                name={section.name}
                placeholder={section.placeholder}
                value={data[section.name] || ''}
                onChange={this.handleChange}
                className={`personal-info-input1 ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                onClick={this.closeCalendar}
                disabled={singPassPopulatedFields?.[section.name]}
              />
            ) : section.isPhone ? (
              <input
                type="tel"
                id={section.name}
                name={section.name}
                placeholder={section.placeholder}
                value={data[section.name] || ''}
                onChange={this.handleChange}
                className={`personal-info-input1 ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                onClick={this.closeCalendar}
                disabled={singPassPopulatedFields?.[section.name]}
              />
            ) : section.isEmail ? (
              <input
                type="email"
                id={section.name}
                name={section.name}
                placeholder={section.placeholder}
                value={data[section.name] || ''}
                onChange={this.handleChange}
                className={`personal-info-input1 ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                onClick={this.closeCalendar}
                disabled={singPassPopulatedFields?.[section.name]}
              />
            ) : (  
              <input
                type="text"
                id={section.name}
                name={section.name}
                placeholder={section.placeholder}
                value={data[section.name] || ''}
                onChange={this.handleChange}
                className={`personal-info-input1 ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                onClick={this.closeCalendar}
                disabled={singPassPopulatedFields?.[section.name]}
              />
            )}
            {errors[section.name] && <span className="error-message3">{errors[section.name]}</span>}
          </div>
        ))}
        
        {/* Contact Number and Email - Only show for NSA/ILP (not Marriage Preparation Programme) */}
        {!isMarriagePreparation && (
          <>
            <div className="input-group1">
              <label htmlFor="cNO">Contact No. 联络号码</label>
              <input
                type="text"
                id="cNO"
                name="cNO"
                placeholder="Contact No. 联络号码"
                value={data.cNO || ''}
                onChange={(e) => this.props.onChange({ cNO: e.target.value })}
                className="personal-info-input1"
                onClick={this.closeCalendar}
                disabled={false}
              />
              {errors.cNO && <span className="error-message3">{errors.cNO}</span>}
            </div>
            
            <div className="input-group1">
              <label htmlFor="eMAIL">Email 电子邮件</label>
              <input
                type="email"
                id="eMAIL"
                name="eMAIL"
                placeholder='Enter "N/A" if no email 如果没有电子邮件，请输入"N/A"'
                value={data.eMAIL || ''}
                onChange={(e) => this.props.onChange({ eMAIL: e.target.value })}
                className="personal-info-input1"
                onClick={this.closeCalendar}
                disabled={false}
              />
              {errors.eMAIL && <span className="error-message3">{errors.eMAIL}</span>}
            </div>
          </>
        )}
      </div>
    );
  }
}

export default PersonalInfo;
