# Rich Text Toolbar Design

## Executive Summary

This document defines the clinical toolbar for the RichTextEditor. The toolbar is minimal, medical-grade, and optimized for clinical documentation workflows.

**Date:** 2026-07-27  
**Status:** DESIGN COMPLETE

---

## 1. Toolbar Groups

### 1.1 Text Formatting

| Button | Command | Keyboard | Clinical Use |
|--------|---------|----------|--------------|
| Bold | `toggleBold()` | Ctrl+B | Emphasize critical findings |
| Italic | `toggleItalic()` | Ctrl+I | Foreign terms, species names |
| Underline | `toggleUnderline()` | Ctrl+U | Drug names, key terms |
| Highlight | `toggleHighlight()` | — | Flag abnormal values |

### 1.2 Structure

| Button | Command | Keyboard | Clinical Use |
|--------|---------|----------|--------------|
| Heading 2 | `toggleHeading({ level: 2 })` | — | Section headers |
| Bullet List | `toggleBulletList()` | — | Differential diagnoses |
| Numbered List | `toggleOrderedList()` | — | Treatment steps |
| Block Quote | `toggleBlockquote()` | — | Patient quotes, referral notes |

### 1.3 History

| Button | Command | Keyboard | Clinical Use |
|--------|---------|----------|--------------|
| Undo | `undo()` | Ctrl+Z | Revert accidental changes |
| Redo | `redo()` | Ctrl+Y | Restore reverted changes |

### 1.4 Insert

| Button | Command | Clinical Use |
|--------|---------|--------------|
| Horizontal Rule | `setHorizontalRule()` | Separate sections |
| Hyperlink | `setLink()` | Reference guidelines |
| Table | Insert 2x3 table | Lab values, vitals |

### 1.5 View

| Button | Command | Clinical Use |
|--------|---------|--------------|
| Fullscreen | Toggle fullscreen | Focus mode |

---

## 2. Disabled Features (Non-Clinical)

| Feature | Reason for Exclusion |
|---------|----------------------|
| Video | Not needed in clinical notes |
| Audio | Security/compliance |
| Emoji | Not professional |
| Font Family | Consistency required |
| Font Size | Consistency required |
| Font Color | Consistency required |
| Background Color | Consistency required |
| Source View | HTML should not be manually edited |
| Print | Use browser print |
| Image upload | Not needed for text notes |
| Media embed | Not needed |
| Embedded iframe | Security risk |
| Paste from Word | Clean HTML only |

---

## 3. Toolbar Behavior

### 3.1 Active States

- Bold/Italic/Underline/Highlight: active when cursor is in formatted text
- Heading/Bullet/Numbered/Quote: active when cursor is in that block type
- Undo/Redo: disabled when history stack empty

### 3.2 Read-Only Mode

- Entire toolbar hidden when `readOnly={true}`
- Editor content displayed without editing controls
- Cursor default, text selectable

### 3.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+Shift+X | Highlight |
| Ctrl+Alt+2 | Heading 2 |

---

## 4. Certification

| Check | Status |
|-------|--------|
| All clinical tools included | ✅ |
| All non-clinical tools excluded | ✅ |
| Keyboard shortcuts documented | ✅ |
| Read-only behavior defined | ✅ |
| Active state behavior defined | ✅ |

**Verdict: TOOLBAR DESIGN COMPLETE**
