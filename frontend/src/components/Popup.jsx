
export default function Popup({ content, isPopupOpen, setIsPopupOpen}) {   
    const onClose = () => {
        setIsPopupOpen(false);
    };
    return (
        <>
        {isPopupOpen && <div className="popup">
            <div className="popup-content">
                <span className="close" onClick={onClose}>&times;</span>
                <p>{content}</p>
            </div>
        </div>}
        </>
    );
}