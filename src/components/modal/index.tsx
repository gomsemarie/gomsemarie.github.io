import React, { forwardRef, useImperativeHandle } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ModalDiv } from "./style";
import { Portal } from "@_components";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface ModalProps {
  title?: string;
  children?: React.ReactNode;
}

export interface ModalRef {
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
export default forwardRef<ModalRef, ModalProps>(({ title, children }, ref) => {
  const [open, setOpen] = React.useState<boolean>(false);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);
  const toggleModal = () => setOpen((s) => !s);
  const getOpen = () => open;

  useImperativeHandle(
    ref,
    () => {
      return { openModal, closeModal, toggleModal, setOpen, getOpen };
    },
    [open]
  );

  return (
    <Portal>
      <ModalDiv
        className={classNames({ opened: open })}
        onClick={() => closeModal()}
      >
        <div
          className="modal-contents-area"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={classNames("modal-title-area", {
              "use-title": title != undefined,
            })}
          >
            <p>{title}</p>
            <button className="close-button" onClick={() => closeModal()}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          {children}
        </div>
      </ModalDiv>
    </Portal>
  );
});
