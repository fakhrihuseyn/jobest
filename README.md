
# Jobest Resume Creator

**Purpose:** A modern, client-side **Resume Creator** web app with a left-side construction panel, layered layout.
---

## ✨ Core Objectives

- **Exact page size & pagination**
  - **A4 (210mm × 297mm), Portrait** — print profile optimized for precise pagination.
  - **Printable page stack**: Content is segmented into page containers. Users can add **next pages below** as needed (Page 2, Page 3…).
  - Controlled page breaks using print CSS (`@page`, `page-break-before/inside/after`) for reliable PDF exports.

- **Layout**
  - **Left panel** = **Construction Panel** (editor): add/remove sections, edit content, re-order layers/cards.
  - **Right panel** = **Live Preview** (page-sized canvases): exact A4 frames with grid helpers (toggle).

- **Design Scheme**
  - **Colors**: White (`#FFFFFF`) and **Light Gray** (e.g., `#F3F4F6`, `#E5E7EB`, `#D1D5DB`).
  - **Separators**: **Soft shadows** (subtle elevation) + **sharp dark color** for dividers and headings.
  - **Candidate name**: **Very large** on the first page; color **`#111827`** (deep slate).
  - **Titles over data**: Section titles are **sized hierarchically** (H1/H2/H3) and **clearly larger** than the entered data.
  - **Corners**: **Not rounded** — use **square corners** throughout.
  - **Layers**: Soft white/gray composition that spans **full width** (left-to-right) of the page body.

- **Fonts**
  - **Google Fonts**: Primary: **Inter** (legible, modern), Fallback: **system-ui**.
  - Include via:
    ```html
    https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap
    ```

- **Features**
  - **Photo upload** (PNG/JPG) — positioned on the **left side** of the first page header.
  - **State saving** — persist user data (localStorage) and allow manual **Save/Load**.
  - **Add/Remove sections (Cards) and Layers** — dynamic editor operations.
  - **PDF Export** — preserves the template’s styling, pagination, and page size.

- **Tech Choice**
  - **Node.js** frontend tooling is **recommended** for this app (best fit for SPA dev tooling, bundlers, and print CSS pipelines). Python is not required unless you plan server-side generation; for a client-first UI with print CSS, **Node.js** is the most suitable.

---

## 🧭 Templates & Mandatory Sections

> The app supports multiple templates. Both include these **mandatory sections**:
> 1. **Photo Upload**
> 2. **Candidate Details** (name, surname, birth date, contacts, address, etc.)
> 3. **Experience**
> 4. **Skills**
> 5. **Education & Certificates**
> 6. **Hobbies**


---

## 📐 Page & Print Specification

- **Target Paper**: **A4 portrait** (210mm × 297mm).
- **Margins**: **12mm** on all sides (printer-safe, compact).
- **Typography (Print Profile)**
  - Base: **Inter**, **10.5pt**, `line-height: 1.35`.
  - Candidate name (Page 1): **48–56pt**, bold (`font-weight: 800`), color `#111827`.
  - Section titles: **14–16pt**, bold (`600–700`), dark text (`#111827`).
  - Body text: **10.5–11pt**, normal (`400`), slate/gray (`#374151` or `#4B5563`).
- **Page Containers**
  - Each page is a fixed-size container with:
    ```css
    .page {
      width: 210mm;
      height: 297mm;
      padding: 12mm;
      box-sizing: border-box;
      background: #fff;
      /* Shadow for screen preview only */
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    @media print {
      .page { box-shadow: none; }
      @page { size: A4 portrait; margin: 12mm; }
    }
    ```
- **Pagination Rules**
  - Use **CSS** to avoid breaks inside headings/photos:
    ```css
    .section, .layer { page-break-inside: avoid; }
    .header, .candidate-name { page-break-after: avoid; }
    ```
  - Long content auto flows to **next page containers**. Editor provides **“Add Page”** button to append `.page` elements below.
- **Export Flow**
  - Preferred: **Print CSS + `window.print()`** (high text fidelity).
  - Alternative: `html2canvas + jsPDF` for snapshotting; ensure scaling to A4 and correct margins.

---