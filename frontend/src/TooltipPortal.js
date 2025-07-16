// TooltipPortal.js
import ReactDOM from "react-dom";

export default function TooltipPortal({ children }) {
  const tooltipRoot = document.getElementById("tooltip-root");
  return tooltipRoot ? ReactDOM.createPortal(children, tooltipRoot) : null;
}
