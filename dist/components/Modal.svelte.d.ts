declare const Modal: import("svelte").Component<{
    open?: boolean;
    onClose?: Function;
    children: any;
}, {}, "">;
type Modal = ReturnType<typeof Modal>;
export default Modal;
