import React, { Component } from 'react';
import '../../../css/sub/uploadedImagesModal.css';

class UploadedImagesModal extends Component {
    copyToClipboard = (url) => {
        navigator.clipboard.writeText(url).then(() => {
            // Could add a temporary "Copied!" message here
            console.log('URL copied to clipboard:', url);
        }).catch(err => {
            console.error('Failed to copy URL:', err);
        });
    };

    render() {
        const { isOpen, onClose, uploadedImages, uploadResults } = this.props;
        
        if (!isOpen) return null;

        return (
            <div className="uploaded-images-modal-overlay">
                <div className="uploaded-images-modal">
                    <div className="uploaded-images-modal-header">
                        <h3>Successfully Uploaded Images</h3>
                        <button 
                            className="uploaded-images-close-btn" 
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="uploaded-images-modal-body">
                        {uploadResults && uploadResults.length > 0 ? (
                            <>
                                <p className="upload-summary">
                                    Uploaded {uploadResults.filter(r => r.success).length} image(s) successfully
                                </p>
                                
                                <div className="uploaded-images-list">
                                    {uploadResults.map((result, index) => (
                                        <div key={index} className={`uploaded-image-item ${result.success ? 'success' : 'error'}`}>
                                            <div className="image-info">
                                                <div className="filename">
                                                    <i className={`fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                                                    <span>{result.filename}</span>
                                                </div>
                                                
                                                {result.success ? (
                                                    <div className="image-url-container">
                                                        <div className="image-url-wrapper">
                                                            <input 
                                                                type="text" 
                                                                value={result.url} 
                                                                readOnly 
                                                                className="image-url-input"
                                                            />
                                                            <button 
                                                                className="copy-url-btn"
                                                                onClick={() => this.copyToClipboard(result.url)}
                                                                title="Copy URL to clipboard"
                                                            >
                                                                <i className="fas fa-copy"></i>
                                                            </button>
                                                        </div>
                                                        
                                                        {result.url && (
                                                            <div className="image-preview">
                                                                <img 
                                                                    src={result.url} 
                                                                    alt={result.filename}
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="error-message">
                                                        <span className="error-text">{result.error}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="no-images">
                                <i className="fas fa-image"></i>
                                <p>No images uploaded yet</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="uploaded-images-modal-footer">
                        <button 
                            className="done-btn"
                            onClick={onClose}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default UploadedImagesModal;