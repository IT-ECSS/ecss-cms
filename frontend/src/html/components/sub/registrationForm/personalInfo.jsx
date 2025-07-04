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

  render() {
    const { data = {}, errors, singPassPopulatedFields, onClearSingPassData } = this.props; // Add onClearSingPassData prop

    // Check if any SingPass fields are populated
    const hasSingPassData = singPassPopulatedFields && Object.values(singPassPopulatedFields).some(field => field === true);

    // Define the sections and their respective fields
    const sections = [
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

      // Define additional options for radio buttons
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
  
      // Map section names to respective radio button options
      const optionMappings = {
        gENDER: genderOptions,
        eDUCATION: educationOptions,
        rACE: raceOptions,
        wORKING: workingStatusOptions,
        rESIDENTIALSTATUS: residentalStatusOptions,
      };
  
      // Get all months and years for selection
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const currentYear = new Date().getFullYear();
      // Get course type from props if available
      const courseType = this.props.data?.type;
      let latestYear;
      if (courseType === 'Marriage Preparation Programme') {
        // Allow any age for Marriage Preparation Programme
        latestYear = new Date().getFullYear();
      } else {
        // Restrict to 50+ for ILP and NSA
        latestYear = new Date().getFullYear() - 50;
      }
      // Assume earliestYear comes from an external source, such as input, settings, etc.
      let earliestYear = 1934; // You can make this dynamic
  
      // Generate the years in ascending order, from earliestYear to latestYear
      const years = Array.from({ length: latestYear - earliestYear + 1 }, (_, i) => earliestYear + i);
  
      const maxDate = new Date();
      if (courseType !== 'Marriage Preparation Programme') {
        maxDate.setFullYear(maxDate.getFullYear() - 50);
      }

    return (
      <div>
        {/* Clear SingPass Data Button */}
        {hasSingPassData && (
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
            ) : section.isSelect && section.isDate ? (
              <>
                <input
                  id={section.name}
                  name={section.name}
                  type="text"
                  className={`personal-info-input ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                  value={this.state.manualDate || data[section.name] || ''} // Use manualDate first, then fall back to data[section.name]
                  placeholder="dd/mm/yyyy"
                  onChange={(e) => { e.stopPropagation(); this.handleChange1(e, "DOB")}}
                  onKeyDown={this.handleBackspace}
                  onBlur={this.closeCalendar}
                  autoComplete='off'
                  disabled={singPassPopulatedFields?.[section.name]} // Disable if populated by SingPass
                />
                <br />
              </>
            ) : (  
              <input
                type="text"
                id={section.name}
                name={section.name}
                placeholder={section.placeholder}
                value={data[section.name] || ''} // Ensure we use empty string as fallback
                onChange={this.handleChange} // Ensure onChange is set
                className={`personal-info-input1 ${singPassPopulatedFields?.[section.name] ? 'disabled-field' : ''}`}
                onClick={this.closeCalendar}
                disabled={singPassPopulatedFields?.[section.name]} // Disable if populated by SingPass
              />
            )}
            {errors[section.name] && <span className="error-message3">{errors[section.name]}</span>}
          </div>
        ))}
        
        {/* Always editable fields - Contact Number and Email */}
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
            disabled={false} // Always editable
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
            disabled={false} // Always editable
          />
          {errors.eMAIL && <span className="error-message3">{errors.eMAIL}</span>}
        </div>
      </div>
    );
  }
}

export default PersonalInfo;
