export function LoadingSpinner() {
  return (
    <div className="flex-center" style={{ padding: '32px' }}>
      <div 
        className="spinner" 
        style={{ 
          width: '32px', 
          height: '32px',
          borderWidth: '3px' 
        }}
      ></div>
    </div>
  )
} 