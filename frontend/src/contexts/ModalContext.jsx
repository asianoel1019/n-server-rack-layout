import { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, HelpCircle, X } from 'lucide-react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'alert', // 'alert' | 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = useCallback((message, title = 'Notification') => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setModal((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModal((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = 'Are you sure?') => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setModal((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModal((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modal.isOpen && (
        <div 
          className="modal-overlay animate-fade" 
          style={{ zIndex: 9999 }}
          onClick={modal.type === 'alert' ? modal.onConfirm : undefined}
        >
          <div 
            className="modal-content animate-scale" 
            style={{ width: '100%', maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {modal.type === 'alert' ? (
                  <AlertCircle size={20} color="var(--c-accent)" />
                ) : (
                  <HelpCircle size={20} color="var(--c-accent)" />
                )}
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>{modal.title}</h2>
              </div>
              <button 
                className="modal-close" 
                onClick={modal.onCancel}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', fontSize: 14, lineHeight: 1.5, color: 'var(--c-text-sec)' }}>
              {modal.message}
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', background: 'var(--c-surface2)' }}>
              {modal.type === 'confirm' ? (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={modal.onCancel}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={modal.onConfirm}
                    style={{ padding: '8px 16px', fontSize: 13 }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button 
                  className="btn-primary" 
                  onClick={modal.onConfirm}
                  style={{ padding: '8px 24px', fontSize: 13 }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
