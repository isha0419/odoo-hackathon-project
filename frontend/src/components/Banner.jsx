const TONE_CLASS = {
  danger: 'banner-danger',
  warning: 'banner-warning',
  success: 'banner-success',
  info: 'banner-info',
};

export default function Banner({ tone = 'info', title, children }) {
  return (
    <div className={`banner ${TONE_CLASS[tone] || TONE_CLASS.info}`}>
      {title && <div className="banner-title">{title}</div>}
      {children}
    </div>
  );
}
