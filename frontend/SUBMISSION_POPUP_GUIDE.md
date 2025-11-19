# SubmissionInProgressPopup Component Documentation

## Overview

`SubmissionInProgressPopup` is a fully responsive, accessible React component that displays a modal dialog indicating that a form submission is in progress. It features:

- ✅ **Responsive Design** - Works seamlessly on mobile, tablet, and desktop devices
- ✅ **Multilingual Support** - English, Chinese (Simplified), and Malay translations
- ✅ **Smooth Animations** - Engaging loading animations with bouncing balls
- ✅ **Accessibility Compliant** - Proper ARIA attributes and semantic HTML
- ✅ **Performance Optimized** - CSS animations with `will-change` and GPU acceleration
- ✅ **Dark Mode Support** - Automatic dark mode styling
- ✅ **Motion Preferences** - Respects `prefers-reduced-motion` setting
- ✅ **High Contrast Mode** - Enhanced visibility for accessibility

## Features

### Responsive Breakpoints

The component adapts to different screen sizes:

| Breakpoint | Use Case | Notes |
|-----------|----------|-------|
| < 480px | Small Mobile | Optimized padding and font sizes |
| 480-767px | Mobile | Default mobile styling |
| 768-1023px | Tablet | Medium-sized modal |
| 1024-1439px | Desktop | Larger modal with enhanced spacing |
| ≥ 1440px | Large Desktop | Maximum modal dimensions |

### Animations

- **Overlay Fade In**: Smooth appearance of the dark overlay
- **Modal Slide Up**: Modal slides in from bottom with scale effect
- **Bouncing Balls**: Four bouncing balls with staggered animation
- **Progress Bar**: Infinite fill animation indicating ongoing process

### Multilingual Support

Built-in translations for:
- **English**: "Submission in Progress", "Generating invoice...", "Please wait"
- **Chinese**: "正在提交中", "正在生成发票...", "请稍候"
- **Malay**: "Sedang Menghantar", "Menjana invois...", "Sila tunggu"

## Installation & Usage

### 1. Import the Component

```jsx
import SubmissionInProgressPopup from './html/components/SubmissionInProgressPopup';
```

### 2. Add to Your Component

```jsx
class FormPage extends Component {
  state = {
    showSubmissionProgress: false,
    selectedLanguage: 'english' // or 'chinese' or 'malay'
  };

  handleSubmit = async () => {
    // Show the popup
    this.setState({ showSubmissionProgress: true });

    try {
      // Your submission logic here
      const response = await axios.post('/api/submit', this.state.formData);
      
      // Hide the popup on success
      this.setState({ showSubmissionProgress: false });
      
      // Handle success...
    } catch (error) {
      // Hide the popup on error
      this.setState({ showSubmissionProgress: false });
      
      // Handle error...
    }
  };

  render() {
    return (
      <div className="form-container">
        {/* Your form content */}
        
        {/* Popup Component */}
        <SubmissionInProgressPopup 
          isOpen={this.state.showSubmissionProgress}
          selectedLanguage={this.state.selectedLanguage}
        />
      </div>
    );
  }
}
```

### 3. Component Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Controls visibility of the modal |
| `selectedLanguage` | string | No | 'english' | Language for translations: 'english', 'chinese', 'malay' |

## CSS Classes Reference

### Main Classes

```
.submission-in-progress-overlay          - Full-screen overlay backdrop
.submission-in-progress-modal            - Main modal container
.submission-progress-header              - Header section
.submission-progress-title               - Title text
.submission-progress-content             - Content wrapper
.submission-loader                       - Loading animation container
.submission-ball                         - Individual bouncing ball
.submission-status-messages              - Messages container
.submission-message-primary              - Primary message
.submission-message-secondary            - Secondary message
.submission-progress-footer              - Footer section
.submission-progress-bar                 - Progress bar container
.submission-progress-fill                - Progress bar fill
```

## Styling Customization

### Override Colors

```css
/* Change primary color */
.submission-ball {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
}

.submission-progress-fill {
  background: linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%);
}
```

### Change Modal Size

```css
.submission-in-progress-modal {
  max-width: 400px; /* Smaller modal */
  /* or */
  max-width: 600px; /* Larger modal */
}
```

### Adjust Animation Speed

```css
.submission-ball {
  animation: submissionBounce 1.0s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
  /* Changed from 1.4s to 1.0s for faster animation */
}
```

## Accessibility Features

### ARIA Attributes

```jsx
<div className="submission-in-progress-overlay" 
     role="dialog" 
     aria-modal="true" 
     aria-label="Submission in progress">
```

### Keyboard Navigation

- The overlay prevents background interaction
- Press `Escape` can be added if needed
- Focus is maintained within the modal

### Screen Reader Support

- Proper semantic HTML structure
- ARIA live region for dynamic content (`aria-live="polite"`)
- Descriptive role and labels

### Reduced Motion

The component respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* All animations are disabled */
  animation: none;
}
```

## Real-World Examples

### Example 1: Basic Usage

```jsx
<SubmissionInProgressPopup 
  isOpen={isSubmitting}
  selectedLanguage="english"
/>
```

### Example 2: With Language Switching

```jsx
<SubmissionInProgressPopup 
  isOpen={isSubmitting}
  selectedLanguage={currentLanguage}
/>
```

### Example 3: In a Form Submission Flow

```jsx
handleFormSubmit = async (formData) => {
  this.setState({ isSubmitting: true });

  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    if (!response.ok) throw new Error('Submission failed');

    // Success handling
    this.setState({ isSubmitting: false });
    this.showSuccessMessage();
  } catch (error) {
    this.setState({ isSubmitting: false });
    this.showErrorMessage(error.message);
  }
}
```

## Performance Considerations

### CSS Optimizations

- GPU-accelerated animations with `will-change: transform`
- Efficient z-index management (9999)
- Backdrop filter with `-webkit` prefix for better browser support

### Best Practices

1. **Keep state simple**: Only toggle `isOpen`
2. **Don't re-render unnecessarily**: Use `shouldComponentUpdate` if needed
3. **Clean up on unmount**: Ensure the modal is closed when component unmounts

```jsx
componentWillUnmount() {
  if (this.state.showSubmissionProgress) {
    this.setState({ showSubmissionProgress: false });
  }
}
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ Full | All features supported |
| Firefox | ✅ Full | All features supported |
| Safari | ✅ Full | Backdrop filter supported |
| Mobile Safari | ✅ Full | Fully responsive |
| Chrome Mobile | ✅ Full | Fully responsive |
| Samsung Internet | ✅ Full | All features supported |

## Common Issues & Solutions

### Issue: Modal doesn't appear

**Solution**: Ensure `isOpen` is set to `true` and the component is properly imported.

```jsx
// Correct
<SubmissionInProgressPopup isOpen={true} />

// Incorrect
<SubmissionInProgressPopup /> {/* isOpen defaults to undefined/false */}
```

### Issue: Animation is laggy

**Solution**: Ensure GPU acceleration is enabled. The component uses `will-change: transform` for optimization.

### Issue: Modal appears behind other content

**Solution**: Check z-index of other elements. This component uses `z-index: 9999`.

```css
/* Adjust if needed */
.submission-in-progress-overlay {
  z-index: 10000; /* Higher than default */
}
```

## Testing

### Unit Test Example

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import SubmissionInProgressPopup from './SubmissionInProgressPopup';

describe('SubmissionInProgressPopup', () => {
  it('should render when isOpen is true', () => {
    render(<SubmissionInProgressPopup isOpen={true} selectedLanguage="english" />);
    expect(screen.getByText('Submission in Progress')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(<SubmissionInProgressPopup isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display correct language translation', () => {
    render(<SubmissionInProgressPopup isOpen={true} selectedLanguage="chinese" />);
    expect(screen.getByText('正在提交中')).toBeInTheDocument();
  });
});
```

## Migration from Old Component

If updating from the old `SubmissionProgressPopup`:

### Old Usage
```jsx
import SubmissionProgressPopup from './SubmissionProgressPopup';
<SubmissionProgressPopup isOpen={true} onClose={() => {}} />
```

### New Usage
```jsx
import SubmissionInProgressPopup from './SubmissionInProgressPopup';
<SubmissionInProgressPopup isOpen={true} selectedLanguage="english" />
```

**Key Changes**:
- New component name for clarity
- Removed `onClose` prop (auto-manage with state)
- Enhanced `selectedLanguage` prop
- Better responsive design
- Improved accessibility

## File Structure

```
frontend/
├── src/
│   ├── html/
│   │   └── components/
│   │       └── SubmissionInProgressPopup.jsx    ← React Component
│   └── css/
│       └── submissionInProgressPopup.css        ← Stylesheet
```

## Support & Contribution

For issues, feature requests, or improvements:
1. Check the existing documentation
2. Review responsive behavior on target device
3. Test accessibility with screen readers
4. Verify multilingual translations

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-19 | Initial release with full responsive support |

---

**Last Updated**: November 19, 2025
**Maintained By**: Development Team
