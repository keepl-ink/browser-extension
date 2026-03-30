import { createRoot } from "react-dom/client";
import App from "./views/App.tsx";

function mountApp() {
	const container = document.createElement("div");
	container.id = "crxjs-app";
	document.body.appendChild(container);
	createRoot(container).render(<App />);
}

mountApp();
