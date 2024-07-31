import useAdmin from "./useAdmin";

//import OutlinedInput from "@mui/material/OutlinedInput";

import SearchInput from "@admin/forms/base/Search";

export default function Search() {
  // const [showValue, setShowValue] = useState(false);

  const { keywords, setKeywords } = useAdmin();
  const handleChange = (evt) => {
    setKeywords(evt.target.value);
  };

  const handleClear = () => {
    setKeywords("");
  };

  /*
  // This avoids a resct serverr different than client error
  useEffect(() => {
    setShowValue(true);
  }, []);
  */

  return (
    <SearchInput
      value={keywords}
      onChange={handleChange}
      name="search"
      type="search"
      placeholder="Keyword search"
      handleClear={handleClear}
      /*
      endAdornment={
        <IconButton
          onClick={handleClear}
          sx={{
            visibility: showValue && keywords.length ? "visible" : "hidden",
          }}
        >
          <CancelIcon sx={{ color: "#999", fontSize: "18px" }} />
        </IconButton>
      }
      */
    />
  );
}
