# **Instruction Document: React + Shadcn Call-Trace Viewer**

## **1. Project Overview**

**Goal:** Build a **read-only visualization tool** for blockchain call traces. The user will upload or select a transaction, and the app will display the recursive execution trace alongside the relevant source code.
**Core Features:**

* **Static Analysis:** No active debugging (step/breakpoints). Purely visualization of a completed transaction.
* **Theming:** Full support for **Dark and Light modes**.
* **Reference:** The UI layout must match `trace2.jpg` (Tenderly-style) but adapt colors for visibility in Light mode.


## **2. Architectural Hierarchy**

Structure the components as follows. All Shadcn components should be imported from `@/components/ui`.

### **2.1 Global Layout: `TraceViewerLayout.tsx`**

* **Providers:** Wrap the application in a `ThemeProvider` (using `next-themes` or React Context) to handle light/dark switching.
* **Layout:** Full-screen flex container (`h-screen w-full flex flex-col bg-background text-foreground`).
* **Main Component:** `ResizablePanelGroup` `[direction="vertical"]`.

1. `ResizablePanel` (Top: Source Code).
2. `ResizableHandle`.
3. `ResizablePanel` (Bottom: Call Trace).

***

## **3. Component Specifications**

### **3.1 Top Panel: Read-Only Code Viewer**

**File:** `components/trace/CodeViewer.tsx`

* **Header (`ViewerHeader`):**
    * **Left:** `Select` (Shadcn) - File selector (e.g., "FiatTokenProxy.sol").
    * **Right:**
        * `Button` (icon) - Copy source.
        * **`ThemeToggle`**: A dropdown or button to switch between Light/Dark/System.
* **Editor (`MonacoWrapper`):**
    * **Settings:** `readOnly: true`, `minimap: { enabled: false }`, `domReadOnly: true`.
    * **Theme Integration:** Listen to the current theme context.
        * If **Dark**: Use `vs-dark`.
        * If **Light**: Use `vs-light` (or a custom light theme).


### **3.2 Bottom Panel: Trace Visualization**

**File:** `components/trace/TraceList.tsx`

* **Control Bar:**
    * **Left:** `Input` - "Search functions..."
    * **Right:** `ToggleGroup` - Filter specific call types (e.g., "Hide Delegates").
* **Container:** `ScrollArea` (Shadcn).
* **Content:** Recursive list of `TraceNode` components.


### **3.3 Recursive Component: `TraceNode.tsx`**

**Role:** Displays a single call frame.
**Styling Requirements (Theme Aware):**

* **Rows:**
    * Dark Mode: `hover:bg-white/5`
    * Light Mode: `hover:bg-black/5`
* **Indentation Lines:** The `border-l-2` must use semantic colors that work on both backgrounds.

**Text Coloring (Critical for Light/Dark Legibility):**
Use Tailwind classes that adapt or define CSS variables for syntax highlighting.

* **Contract Name:** Dark: `text-blue-400` / Light: `text-blue-700`
* **Function Name:** Dark: `text-purple-400` / Light: `text-purple-700`
* **Arguments/Values:** Dark: `text-zinc-400` / Light: `text-zinc-600`
* **Return Values:** Dark: `text-teal-400` / Light: `text-teal-700`
* **Reverts:** `text-red-500` (works in both).

***

## **4. Data Model (`TxTrace.ts`)**

* Use the interfaces provided in `TxTrace.ts` (`FunctionCallEvent`, `FunctionResultEvent`).
* Mock Data: Create a `mockTrace.ts` with a deeply nested call structure to test the recursive rendering.


## **5. Styling \& Theming Implementation**

### **Setup Instructions for the Agent:**

1. **Install `next-themes`:** Configure the `ThemeProvider` in the root.
2. **Tailwind Configuration:** Ensure `tailwind.config.js` extends colors using Shadcn's CSS variables (e.g., `background`, `foreground`, `muted`, `muted-foreground`).
3. **Monaco Editor:** You must dynamically update the `theme` prop of the Monaco component when the global theme changes.

### **Color Palette Reference**

| Element | Dark Mode (Reference) | Light Mode (Mapped) |
| :-- | :-- | :-- |
| **Background** | `bg-zinc-950` | `bg-white` |
| **Panel Border** | `border-zinc-800` | `border-zinc-200` |
| **Trace Node Hover** | `bg-white/5` | `bg-black/5` |
| **Call Badge (Static)** | `bg-blue-900 text-blue-200` | `bg-blue-100 text-blue-900` |
| **Call Badge (Revert)** | `bg-red-900 text-red-200` | `bg-red-100 text-red-900` |


***

**Prompt for AI Agent:**
> "Build a **read-only Call-Trace Viewer** using React, Shadcn UI, and Monaco Editor. Implement the `TraceNode` component recursively to visualize the `TxTrace.ts` data structure. Include a **Theme Toggle** that switches the UI and Monaco Editor between Dark and Light modes. Ensure text colors for contract names and functions have sufficient contrast in both modes (e.g., lighter pastels for Dark mode, darker shades for Light mode)."
<span style="display:none">[^3_1][^3_2][^3_3]</span>