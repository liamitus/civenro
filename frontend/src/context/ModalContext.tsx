// frontend/src/context/ModalContext.tsx

import { ReactNode, createContext, useState } from 'react';
import LoginModal from '../components/LoginModal';

type ModalType = 'auth' | 'anotherModalType';

interface ModalContextProps {
  showModal: (modalType: ModalType, onSuccess?: () => void) => void;
  hideModal: () => void;
}

export const ModalContext = createContext<ModalContextProps>({
  showModal: () => {},
  hideModal: () => {},
});

export const ModalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [modalState, setModalState] = useState<{
    type: ModalType;
    open: boolean;
  }>({
    type: 'auth',
    open: false,
  });
  const [onSuccessCallback, setOnSuccessCallback] = useState<() => void>(
    () => {}
  );

  const showModal = (type: ModalType, onSuccess?: () => void) => {
    setModalState({ type, open: true });
    if (onSuccess) {
      setOnSuccessCallback(() => onSuccess);
    }
  };

  const hideModal = () => {
    setModalState({ type: modalState.type, open: false });
    setOnSuccessCallback(() => {});
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {modalState.type === 'auth' && (
        <LoginModal
          open={modalState.open}
          onClose={hideModal}
          onAuthSuccess={() => {
            if (onSuccessCallback) {
              onSuccessCallback();
            }
            hideModal();
          }}
        />
      )}
      {/* Render other modals based on modalState.type */}
    </ModalContext.Provider>
  );
};
