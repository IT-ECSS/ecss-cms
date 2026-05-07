# PopupMessage System

A unified popup/notification system for the ECSS CMS that handles loading, success, error, confirmation, input, and selection popups.

## Overview

The PopupMessage system provides a centralized way to manage all user notifications and interactions throughout the application. It replaces scattered popup implementations with a single, consistent component system.

## Components

### 1. LoadingPopup
Displays a loading animation with a custom message.
```jsx
<LoadingPopup message="Processing your request..." />
```

### 2. SuccessPopup
Shows a success notification with an icon, heading, and message.
```jsx
<SuccessPopup message="Operation completed successfully!" />
```

### 3. ErrorPopup
Displays an error notification with an icon, heading, and message.
```jsx
<ErrorPopup message="An error occurred. Please try again." />
```

### 4. ConfirmationPopup
Shows a confirmation dialog with a custom action button.
```jsx
<ConfirmationPopup
  title="Delete Account"
  message="Are you sure you want to delete this account?"
  buttonText="Delete"
  isDangerous={true}
  onConfirm={() => handleDelete()}
/>
```

### 5. InputPopup
Provides text or password input with validation.
```jsx
<InputPopup
  title="Change Password"
  message="Enter your new password:"
  inputType="password"
  placeholder="New Password"
  isPassword={true}
  onSubmit={(password) => handlePasswordChange(password)}
/>
```

### 6. SelectionPopup
Shows a dropdown selection dialog.
```jsx
<SelectionPopup
  title="Select Location"
  message="Choose a location for the course:"
  options={[
    { value: 'loc1', label: 'Location 1' },
    { value: 'loc2', label: 'Location 2' }
  ]}
  onSubmit={(value) => handleLocationSelect(value)}
/>
```

## Usage

### Basic Setup

1. Import the `usePopup` hook and `PopupManager` component in your app:

```jsx
import { usePopup, PopupManager } from './html/components/popup/PopupMessage';

function App() {
  const { popup, showLoading, showSuccess, showError, closePopup } = usePopup();

  return (
    <>
      <YourContent />
      <PopupManager popup={popup} onClose={closePopup} />
    </>
  );
}
```

2. Use the hook methods to display popups:

```jsx
// Show loading
showLoading('Saving changes...');

// Show success
showSuccess('Changes saved successfully!');

// Show error
showError('Failed to save changes');

// Show confirmation
showConfirmation({
  title: 'Delete?',
  message: 'Are you sure?',
  buttonText: 'Delete',
  isDangerous: true,
  onConfirm: () => handleDelete()
});

// Show input
showInput({
  title: 'Password',
  message: 'Enter new password:',
  inputType: 'password',
  placeholder: 'New Password',
  isPassword: true,
  onSubmit: (password) => handlePasswordChange(password)
});

// Show selection
showSelection({
  title: 'Select Location',
  message: 'Choose a location:',
  options: [
    { value: 'loc1', label: 'Location 1' },
    { value: 'loc2', label: 'Location 2' }
  ],
  onSubmit: (value) => handleLocationSelect(value)
});
```

### Advanced Usage with API Calls

```jsx
const handleDeleteAccount = async (accountId) => {
  try {
    showLoading('Deleting account...');
    await deleteAccount(accountId);
    showSuccess('Account deleted successfully');
  } catch (error) {
    showError(error.response?.data?.message || 'Failed to delete account');
  } finally {
    closePopup();
  }
};
```

### Async Workflow

```jsx
const handleChangePassword = async () => {
  showInput({
    title: 'Change Password',
    message: 'Enter your new password:',
    inputType: 'password',
    placeholder: 'New Password',
    isPassword: true,
    onSubmit: async (newPassword) => {
      try {
        showLoading('Updating password...');
        await changePassword(accountId, newPassword);
        showSuccess('Password changed successfully');
      } catch (error) {
        showError('Failed to change password');
      }
    }
  });
};
```

## API Integration

The system includes pre-configured API calls in `utils/apiService.js`:

### Account Management
- `changePassword(accountId, newPassword)`
- `resetPassword(username, password)`
- `deleteAccount(accountId)`
- `logout(accountId)`

### Course Registration
- `deleteCourseRegistration(id)`
- `sendDetails(id)`
- `portOverRegistration(id, selectedLocation)`
- `addReceiptNumber(id, participant, staff, receiptNo, status)`
- `updateEntry(entry)`

### Receipt Management
- `generateReceiptNumber(courseLocation, centreLocation)`
- `createReceiptRecord(receiptNo, location, registration_id, url, staff)`

### Inventory & Stock
- `updateWooCommerceStock(courseChiName, courseEngName, courseLocation, updatedStatus, location, updateType)`
- `portOverWooCommerce(courseChiName, courseEngName, courseLocation, updatedStatus, location)`

### Other
- `updateAccessRights(accessRight, accessRightId)`

## Hook Methods

The `usePopup` hook provides the following methods:

| Method | Description |
|--------|-------------|
| `showPopup(config)` | Show a popup with custom configuration |
| `closePopup()` | Close the current popup |
| `showLoading(message)` | Show loading popup |
| `showSuccess(message)` | Show success notification |
| `showError(message)` | Show error notification |
| `showConfirmation(config)` | Show confirmation dialog |
| `showInput(config)` | Show input dialog |
| `showSelection(config)` | Show selection dialog |

## Styling

The system uses CSS classes that can be customized in `PopupManager.css`:

- `.popup-backdrop` - Overlay backdrop
- `.popup-container` - Main popup container
- `.loading-popup` - Loading popup styles
- `.success-popup-notification` - Success popup styles
- `.login-error-notification` - Error popup styles
- `.confirmation-popup` - Confirmation popup styles
- `.input-popup` - Input popup styles
- `.selection-popup` - Selection popup styles

## Features

✅ **Unified System** - Single entry point for all popups
✅ **Type-safe** - Clear configuration for each popup type
✅ **Error Handling** - Input validation for input/selection popups
✅ **Responsive** - Mobile-friendly design
✅ **Accessible** - ARIA labels and semantic HTML
✅ **Animated** - Smooth fade and slide animations
✅ **API Integration** - Pre-configured API calls
✅ **Customizable** - Easy to extend and customize

## Migration Guide

### From Direct Popup Implementation
**Before:**
```jsx
const handleDelete = () => {
  alert('Are you sure?');
};
```

**After:**
```jsx
const handleDelete = () => {
  showConfirmation({
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this?',
    buttonText: 'Delete',
    isDangerous: true,
    onConfirm: () => performDelete()
  });
};
```

## Best Practices

1. **Always provide meaningful messages** - Help users understand what's happening
2. **Use appropriate popup types** - Choose the right popup for the action
3. **Handle errors gracefully** - Show specific error messages
4. **Auto-close** - Consider auto-closing success messages after 2-3 seconds
5. **Validate input** - Use input validation in InputPopup components
6. **Provide feedback** - Use loading popups for async operations

## Example: Complete Flow

```jsx
import { usePopup, PopupManager, deleteCourseRegistration } from './html/components/popup/PopupMessage';

function CourseRegistrationTable() {
  const { popup, closePopup, showLoading, showSuccess, showError, showConfirmation } = usePopup();

  const handleDeleteCourse = (id) => {
    showConfirmation({
      title: 'Delete Course Registration',
      message: 'Are you sure you want to delete this course registration?',
      buttonText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          showLoading('Deleting course registration...');
          await deleteCourseRegistration(id);
          closePopup();
          showSuccess('Course registration deleted successfully');
        } catch (error) {
          closePopup();
          showError(error.message || 'Failed to delete course registration');
        }
      }
    });
  };

  return (
    <>
      <table>
        {/* Table content */}
        <button onClick={() => handleDeleteCourse(courseId)}>Delete</button>
      </table>
      <PopupManager popup={popup} onClose={closePopup} />
    </>
  );
}
```

## Troubleshooting

### Popup doesn't appear
- Ensure `PopupManager` is rendered in your component tree
- Check that `popup` state is passed correctly
- Verify `closePopup` is passed to `PopupManager`

### Input validation not working
- Ensure `isPassword` is set correctly for password inputs
- Check that custom validation logic is implemented
- Verify error messages are displayed

### API calls failing
- Check API endpoints in `apiService.js`
- Verify axios is installed
- Check CORS settings if cross-origin requests are being made
- Review browser console for error details

## Future Enhancements

- [ ] Auto-close notifications after X seconds
- [ ] Toast notifications (non-blocking)
- [ ] Modal size customization
- [ ] Animation variations
- [ ] Keyboard shortcuts (ESC to close, Enter to confirm)
- [ ] Internationalization (i18n) support
- [ ] Accessibility improvements (screen reader testing)
