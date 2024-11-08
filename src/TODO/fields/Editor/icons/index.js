import * as buttons from "./buttons";
import * as icons from "./icons";

let Icons = {};
for (let [key, Value] of Object.entries(buttons)) {
  Icons[key] = (props) => (
    <i className="format">
      <Value />
    </i>
  );
}

for (let [key, Value] of Object.entries(icons)) {
  Icons[key] = (props) => (
    <i className="icon">
      <Value />
    </i>
  );
}

export default Icons;
