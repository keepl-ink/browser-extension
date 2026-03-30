import { useState } from "react";
import Logo from "@/assets/crx.svg";
import "./App.css";

export default function App() {
	const [show, setShow] = useState(false);

	return (
		<div className="popup-container">
			{show && (
				<div className="popup-content opacity-100">
					<h1>HELLO CRXJS</h1>
				</div>
			)}
			<button className="toggle-button" onClick={() => setShow(!show)}>
				<img src={Logo} alt="CRXJS logo" className="button-icon" />
			</button>
		</div>
	);
}
