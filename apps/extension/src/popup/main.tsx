import React from "react"
import { createRoot } from "react-dom/client"
import { Popup } from "./Popup"
import "./style.css"

const root = document.getElementById("root")!
createRoot(root).render(<Popup />)
