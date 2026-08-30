# System Equations & Algorithmic Logic (P09 - Vehicle Service Predictor)

This document outlines the exact mathematical formulas and logical rules powering the predictive engine.

## 1. Calculating Daily Run Rate (Velocity)
To figure out how fast a vehicle burns through distance, the engine locates the two most recent distinct odometer readings.

- **Formula**:  
  `Daily_Rate = (Km_Reading_A - Km_Reading_B) / Days_Between(Date_A, Date_B)`
- **Edge Case Protection**:  
  If `Daily_Rate < 0` (which implies a data entry error where the odometer ran backward), the engine explicitly clamps the rate to `0`.

## 2. Distance-Based Rule (e.g., Tyres, Brake Pads)
This relies on the vehicle's unique `Daily_Rate` to project exactly when a part will reach its wear limit.

- **Step 1 (Find Limit)**: `Next_Due_Km = Last_Service_Km + Rule_Every_Km`
- **Step 2 (Find Distance Left)**: `Km_Remaining = Next_Due_Km - Current_Odometer`
- **Step 3 (Find Time Left)**: `Days_Remaining = Km_Remaining / Daily_Rate`
- **Step 4 (Find Exact Date)**: `Due_Date = Today + Days_Remaining`
- **Edge Case Protection**:  
  If `Km_Remaining < 0`, the threshold is already passed. Instead of projecting a future date, the engine back-calculates how overdue the vehicle is:  
  `Days_Overdue = Math.round( Math.abs(Km_Remaining) / Daily_Rate )`

## 3. Period-Based Rule (e.g., Engine Oil)
This uses pure date arithmetic, avoiding naive 30-day multiplication to properly respect leap years and varying month lengths.

- **Formula**:  
  `Due_Date = Date.setMonth( Last_Service_Date.getMonth() + Rule_Every_Months )`
- **Fallback Rule**:  
  If the vehicle has never had this specific service logged in its history, `Last_Service_Date` gracefully defaults to the date of its earliest known odometer reading.

## 4. Status Evaluation (The Badges)
Every actionable item is evaluated by comparing its `Due_Date` against the `case.today` variable.

- **Formula**:  
  `Days_Until = (Due_Date - Today) / 86400000` *(converted from milliseconds to days)*
- **Threshold Rules**:
  - If `Days_Until < 0` ➔ 🔴 **Overdue**
  - If `0 <= Days_Until <= 14` ➔ 🟡 **Due Soon**
  - If `Days_Until > 14` ➔ 🟢 **Fine**

## 5. Call List Sorting Algorithm
The problem strictly required sorting so the "most overdue" and "highest value" work appears first. We built a weighted scoring algorithm to enforce this.

- **If the vehicle has Overdue items**:  
  `Score = 1000 + Max_Days_Overdue`  
  *(Guarantees overdue vehicles are pushed to the absolute top of the list)*
- **If the vehicle only has Due Soon items**:  
  `Score = 500 - Min_Days_Until`  
  *(Pushes them into the middle block, prioritizing those closest to 0 days)*
- **Tie-Breaker Rule**:  
  If two vehicles output the exact same `Score`, they are sorted by `Total_Est_Cost` descending (highest revenue jobs win the tie).

## 6. Bonus Feature: 8-Week Forecast Bucketing
To map future workloads into weekly columns on the chart, items are bucketed strictly based on `Days_Until`.

- **Formula**:  
  `Week_Bucket = Math.floor(Days_Until / 7)`
- **Aggregation**:  
  If `Week_Bucket` is 0, the item falls into the "Overdue/Week 1" column. If it is 1, it falls into "Week 2", and so on up to Week 8. The `Cost` of every item in that bucket is summed together to map out the financial forecast.
