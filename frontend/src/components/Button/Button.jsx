import './Button.css';

// variant: 'primary' | 'secondary' | 'ghost' | 'danger'
export default function Button({ variant = 'secondary', children, className = '', ...rest }) {
  return (
    <button className={`btn btn--${variant} ${className}`} {...rest}>
      {children}
    </button>
  );
}