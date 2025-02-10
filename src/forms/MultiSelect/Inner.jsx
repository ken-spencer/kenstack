
import CancelIcon from "@kenstack/icons/Cancel";

export default function Inner({
  field,
  options,
  loadOptions,
}) {
  let selectedOptions = [];
  if (options) {
    selectedOptions = options.filter(([ key ]) => {
      return field.value && field.value.includes(key);
    })
   }

  if (selectedOptions.length === 0) {
    return <div>None selected</div>;
  }

  return (
    <div>
      {selectedOptions.map(([ key, label ]) => {
        return (
          <div className="flex gap-2 vertical-center" key={key}>
            {label} 
            <label className="flex items-center cursor-pointer">
              <CancelIcon className="w-4 h-4" />
            <input
              className="sr-only"
              name={field.name}
              type="checkbox"
              defaultChecked
              value={key}
              onChange={() => {
                field.setValue(field.value.filter((k) => k != key))
                
              }}
            />
          </label>
          </div>
        );
      })}
    </div>
    
  )  
}
