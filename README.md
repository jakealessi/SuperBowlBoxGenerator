# Super Bowl Box Generator

This is a small single-page web app that helps you create and manage a 10x10 Super Bowl squares pool.

It runs entirely in the browser (no backend) and stores your current setup in local storage so you can refresh and come back later. It is suitable for static hosting (for example, GitHub Pages).

## Main workflow

1. Enter participant names and how many boxes each person gets.
2. Make sure the total number of boxes adds up to exactly 100.
3. Set the teams, box price, payout split, and optional vig.
4. Click "Generate Grid" to randomize the numbers and assign boxes to participants.

You can regenerate the grid at any time; each generation re-randomizes both the numbers and box assignments (after a confirmation prompt).

## Features

### Participants and box assignment

- Add as many participants as you want.
- Each participant has:
  - A name
  - A number of boxes
- Live display of "Total Boxes Assigned (X / 100)".
- "Fill remaining to 100" button:
  - If the total is below 100, it adds the remaining boxes to the last participant with a name.

### Teams and grid

- Inputs for:
  - Team on top (columns)
  - Team on left (rows)
- The generated grid shows:
  - The top team name above the 0–9 column numbers.
  - The left team name in the corner cell beside the 0–9 row numbers.
- The 10x10 grid:
  - Each square shows:
    - The participant name who owns that box.
    - The score combination as "column-digit – row-digit".
  - Each participant gets a consistent color across all of their boxes.

### Pricing, vig, and payouts

- Box price input; total pot is calculated as:
  - `total pot = box price × total boxes`
- Optional vig:
  - Toggle to enable/disable a house cut.
  - Separate input for vig percentage.
  - Shows:
    - Total pot (before vig)
    - House vig amount
    - Payout pool (after vig)
- Payout split options:
  - Several preset splits (for example, 25/25/25/25, 20/20/20/40, final-only, halftime/final splits, etc.).
  - Payouts panel shows the dollar amount for each quarter/final based on the payout pool.

### Custom payout split

- Custom fields for Q1, Q2, Q3, and Final percentages.
- "Use custom split" button:
  - Validates that the four values add up to exactly 100%.
  - If valid, creates/selects a "Custom" option in the payout split dropdown.
  - If invalid, shows a message explaining that the total must be 100%.

### Validation and hints

- Generate button is disabled unless:
  - Total boxes = 100, and
  - Payout pool is greater than 0.
- Helper text under the Generate button:
  - Explains what is missing if you do not yet meet the conditions (e.g. not 100 boxes, box price 0).

### Clean / print view

- "Clean / Print View" toggle:
  - Hides the header and all input panels.
  - Leaves only the generated grid and payout information.
- Print stylesheet:
  - Further simplifies the layout for printing from the browser.

### Local storage persistence

- The app automatically saves your configuration to local storage:
  - Participants and box counts
  - Team names
  - Box price
  - Selected payout split (including custom)
  - Vig toggle and percentage
  - Custom split input values
- On reload:
  - The last configuration is restored.
  - If a previously generated grid matches the current configuration, it is also restored (numbers and assignments).

