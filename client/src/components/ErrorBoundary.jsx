import { Component } from 'react';

/* Catches render-time errors in its subtree so a single bad record can't
   crash the whole page. */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="error-fallback">
          אירעה שגיאה בהצגת התצוגה.
        </div>
      );
    }
    return this.props.children;
  }
}
