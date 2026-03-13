export default function ItemCard({ item, buttonLogic }) {
    const { item_name, serial_number, day_of_week, start_time, end_time, course_name, lab_name} = item;

    return (
        <div>
            <h3>{item_name}</h3>
            <p>Serial Number: {serial_number}</p>
            <p>Course: {course_name}</p>
            <p>Borrow time: {day_of_week}, {start_time} - {end_time}</p>
            <p>From Lab: {lab_name}</p>
            <button onClick={buttonLogic}>Borrow</button>
        </div>
    );
}