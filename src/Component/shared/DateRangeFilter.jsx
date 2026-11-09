import { useState } from "react";
import "./DateRangeFilter.css";

export default function DateRangeFilter({ fromDate, toDate, onApply }) {
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (draftFromDate && draftToDate && draftFromDate > draftToDate) {
      setError("Start date must be on or before end date.");
      return;
    }
    setError("");
    onApply(draftFromDate, draftToDate);
  };

  const handleClear = () => {
    setDraftFromDate("");
    setDraftToDate("");
    setError("");
    onApply("", "");
  };

  return (
    <form className="date-range-filter" onSubmit={handleSubmit}>
      <label>
        <span>From</span>
        <input
          type="date"
          value={draftFromDate}
          onChange={(event) => setDraftFromDate(event.target.value)}
        />
      </label>
      <label>
        <span>To</span>
        <input
          type="date"
          value={draftToDate}
          onChange={(event) => setDraftToDate(event.target.value)}
        />
      </label>
      <button type="submit">Apply dates</button>
      <button type="button" className="date-range-clear" onClick={handleClear}>
        Clear
      </button>
      {error && <span className="date-range-error" role="alert">{error}</span>}
    </form>
  );
}
