

## 📦 Component Overview

**File**: `SubmissionInProgressPopup.jsx`
**Stylesheet**: `submissionInProgressPopup.css`
**Integration**: `formPage.jsx`

---

## 🏗️ Component Structure

```jsx
SubmissionInProgressPopup (Class Component)
├── getTranslations()
│   ├── submissionInProgress
│   │   ├── english: "Submission in Progress"
│   │   ├── chinese: "正在提交中"
│   │   └── malay: "Sedang Menghantar"
│   ├── generatingInvoice
│   │   ├── english: "Generating invoice..."
│   │   ├── chinese: "正在生成发票..."
│   │   └── malay: "Menjana invois..."
│   └── pleaseWait
│       ├── english: "Please wait"
│       ├── chinese: "请稍候"
│       └── malay: "Sila tunggu"
└── render()
    ├── Overlay (backdrop)
    ├── Modal Container
    │   ├── Header Section
    │   │   └── Title
    │   ├── Content Section
    │   │   ├── Loader (4 bouncing balls)
    │   │   └── Messages (primary + secondary)
    │   └── Footer Section
    │       └── Progress Bar
```

---

## 📋 Class Names & Hierarchy

### **Overlay Classes**
```css
.submission-in-progress-overlay
  └── Full-screen dark backdrop with blur effect
      └── z-index: 9999 (highest priority)
```

### **Modal Classes**
```css
.submission-in-progress-modal
  ├── Main container (white, rounded, shadowed)
  ├── .submission-progress-header
  │   ├── .submission-progress-title (large, bold text)
  │   └── Margin-bottom for spacing
  ├── .submission-progress-content
  │   ├── .submission-loader
  │   │   ├── .submission-ball (4 instances)
  │   │   ├── .submission-ball-1 (animation-delay: 0s)
  │   │   ├── .submission-ball-2 (animation-delay: 0.2s)
  │   │   ├── .submission-ball-3 (animation-delay: 0.4s)
  │   │   └── .submission-ball-4 (animation-delay: 0.6s)
  │   └── .submission-status-messages
  │       ├── .submission-message-primary (bold, main message)
  │       └── .submission-message-secondary (light, supportive text)
  └── .submission-progress-footer
      └── .submission-progress-bar
          └── .submission-progress-fill (animated gradient)
```

---

## 🎨 Responsive Breakpoints

| Breakpoint | Device Type | Modal Width | Font Size | Loader | Notes |
|-----------|-------------|-------------|-----------|--------|-------|
| < 480px | Small Mobile | 100% | 1.125rem | 14px | Compact spacing |
| 480-767px | Standard Phone | 90% | 1.125rem | 15px | Medium spacing |
| 768-1023px | Tablet | 85% | 1.5rem | 18px | Enhanced spacing |
| 1024-1439px | Desktop | 80% | 1.75rem | 20px | Large spacing |
| 1440px+ | Large Desktop | 75% | 1.875rem | 22px | Extra spacing |

---

## 🌐 Translations Structure

### English
```
Title: "Submission in Progress"
Primary: "Generating invoice..."
Secondary: "Please wait"
```

### Chinese (Simplified)
```
Title: "正在提交中"
Primary: "正在生成发票..."
Secondary: "请稍候"
```

### Malay
```
Title: "Sedang Menghantar"
Primary: "Menjana invois..."
Secondary: "Sila tunggu"
```

---

## 🎬 Animations

### **Overlay Fade-In** (overlayFadeIn)
- Duration: 0.3s
- Easing: ease-out
- Effect: Opacity 0 → 1

### **Modal Slide-Up** (modalSlideInUp)
- Duration: 0.4s
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1)
- Effect: translateY(30px) + scale(0.95) → default position + scale(1)

### **Ball Bounce** (submissionBounce)
- Duration: 1.4s
- Easing: cubic-bezier(0.68, -0.55, 0.265, 1.55)
- Effect: Bounces up 35px
- Repeat: Infinite
- Individual delays: 0s, 0.2s, 0.4s, 0.6s

### **Progress Fill** (progressFill)
- Duration: 2s
- Easing: ease-in-out
- Effect: Width 0% → 100% → 100%
- Repeat: Infinite

---

## 💾 Component Props

```jsx
<SubmissionInProgressPopup 
  isOpen={boolean}              // Controls visibility (required)
  selectedLanguage={string}     // 'english', 'chinese', or 'malay' (default: 'english')
/>
```

---

## 📦 Usage in formPage.jsx

### **Import**
```jsx
import SubmissionInProgressPopup from './SubmissionInProgressPopup';
```

### **State Initialization**
```jsx
state = {
  showSubmissionInProgress: false,
  selectedLanguage: 'english',
  // ... other state
}
```

### **Show Popup**
```jsx
this.setState({ showSubmissionInProgress: true });
```

### **Hide Popup**
```jsx
this.setState({ showSubmissionInProgress: false });
```

### **Render Component**
```jsx
<SubmissionInProgressPopup 
  isOpen={this.state.showSubmissionInProgress}
  selectedLanguage={this.state.selectedLanguage}
/>
```

---

## 🎯 CSS Responsive Strategy

### **clamp() Functions**
Used for fluid font scaling:
```css
font-size: clamp(1.25rem, 5vw, 1.75rem);
/* min: 1.25rem, preferred: 5vw, max: 1.75rem */
```

### **Media Query Tiers**
```css
/* Small Mobile: max-width 479px */
@media (max-width: 479px) { }

/* Standard Phone: 480px - 767px */
@media (min-width: 480px) and (max-width: 767px) { }

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop: 1024px - 1439px */
@media (min-width: 1024px) and (max-width: 1439px) { }

/* Large Desktop: 1440px+ */
@media (min-width: 1440px) { }

/* Landscape: orientation portrait + height constraint */
@media (orientation: landscape) and (max-height: 600px) { }
```

---

## ♿ Accessibility Features

### **ARIA Attributes**
```jsx
<div role="dialog" aria-modal="true" aria-label="Submission in progress">
<div role="status" aria-live="polite">
```

### **High Contrast Mode**
```css
@media (prefers-contrast: more) {
  /* Enhanced text contrast */
  /* Stronger borders and shadows */
}
```

### **Reduced Motion**
```css
@media (prefers-reduced-motion: reduce) {
  /* All animations removed */
  /* Static display maintained */
}
```

### **Dark Mode**
```css
@media (prefers-color-scheme: dark) {
  /* Dark background colors */
  /* Light text for contrast */
  /* Adjusted gradient colors */
}
```

---

## 🔍 Component Specifications

### **Colors**
- **Modal Background**: `#ffffff` (white)
- **Title Text**: `#1f2937` (dark gray)
- **Primary Message**: `#374151` (medium gray)
- **Secondary Message**: `#6b7280` (light gray)
- **Ball Gradient**: `#3b82f6` → `#2563eb` (blue)
- **Overlay**: `rgba(0, 0, 0, 0.85)` (dark with transparency)
- **Progress Bar Background**: `#f3f4f6` (light gray)
- **Progress Fill**: `#3b82f6` → `#2563eb` → `#1d4ed8` (blue gradient)

### **Dimensions**
- **Modal Max-Width**: 480px (responsive down to 100%)
- **Modal Padding**: 32px 24px (responsive per device)
- **Loader Height**: 80px (responsive per device)
- **Ball Size**: 16px (responsive per device)
- **Progress Bar Height**: 6px (responsive per device)

### **Typography**
- **Font Family**: Inherited from parent (Arial typically)
- **Title Font Weight**: 700 (bold)
- **Primary Message Weight**: 600 (semi-bold)
- **Secondary Message Weight**: 400 (regular)
- **Line Height**: 1.3 - 1.5 (optimal readability)

### **Shadows & Effects**
- **Modal Shadow**: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)
- **Backdrop Filter**: blur(4px) with -webkit prefix
- **Ball Shadow**: 0 4px 12px rgba(59, 130, 246, 0.35)
- **Progress Fill Shadow**: 0 0 10px rgba(59, 130, 246, 0.5)

### **Z-Index**
- **Overlay**: 9999 (ensures modal is always on top)

---

## ✅ Quality Checklist

- [x] Responsive across all screen sizes
- [x] Multilingual (English, Chinese, Malay)
- [x] Smooth animations (GPU-accelerated)
- [x] Proper class naming convention
- [x] Semantic HTML structure
- [x] ARIA attributes for accessibility
- [x] Dark mode support
- [x] High contrast mode support
- [x] Reduced motion support
- [x] Cross-browser compatible
- [x] Performance optimized
- [x] Mobile-first design approach

---

## 🚀 Ready for Production

This component is production-ready with:
- ✅ Comprehensive responsive design
- ✅ Complete multilingual support
- ✅ Full accessibility compliance
- ✅ Smooth animations
- ✅ Clean component structure
- ✅ Proper CSS organization

---

**Last Updated**: November 19, 2025
**Component Version**: 1.0
**Status**: ✅ Production Ready
