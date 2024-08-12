import React from "react";

import useField from "../useField";

import styles from "./select.module.scss";

import Error from "../Error";
import SearchInput from "./SearchInput";

export default function Select(props) {
  const [visible, setVisible] = React.useState(false);

  const inputRef = React.useRef();
  const searchRef = React.useRef();
  const menuRef = React.useRef();
  const lastPos = React.useRef();
  const lastKeyTime = React.useRef();
  const buttonContRef = React.useRef();

  const field = useField(props, inputRef);
  const [options, setOptions] = React.useState(field.props.options || []);
  const [selected, setSelected] = React.useState(field.value);

  /*
  const handleClose = React.useCallback(() => {
    field.blurred = true;
  }, [field]);
  */

  /*
  const handleChange = React.useCallback(
    (evt) => {
      field.value = evt.target.value;
    },
    [field],
  );
  */

  /*
  const getInputRef = React.useCallback((div) => {
    if (div) {
      inputRef.current = div.querySelector("input");
    }
  }, []);
  */

  const toggleSelect = React.useCallback(
    (toVisible = !visible) => {
      /*
      // Event is being fired by using the arrow keys on the radio buttons
      if (
        (evt.type === "click" && evt.clientX === 0 && evt.clientY === 0) ||
        evt.target.nodeName === "LABEL"
      ) {
        return;
      }
      */

      if (toVisible) {
        // const button = evt.target;
        const menu = menuRef.current; // button.nextElementSibling.nextElementSibling;

        menu.style.maxHeight = "";
        menu.style.top = "";
        menu.style.bottom = "";

        const rect = buttonContRef.current.getBoundingClientRect();
        const above = rect.top;
        const below = window.innerHeight - rect.bottom;
        const menuHeight = menu.offsetHeight;

        if (menuHeight <= below) {
          menu.style.top = rect.y + "px"; // button.offsetHeight + "px";
          menu.style.bottom = "auto";
        } else if (menuHeight <= above) {
          menu.style.top = "auto";
          menu.style.bottom = rect.height + "px"; //button.offsetHeight + "px";
        } else if (below >= above) {
          menu.style.maxHeight = below - 50 + "px";
          menu.style.top = rect.height + "px"; //button.offsetHeight + "px";
          menu.style.bottom = "auto";
        } else {
          menu.style.maxHeight = above - 50 + "px";
          menu.style.top = "auto";
          menu.style.bottom = rect.height + "px"; //button.offsetHeight + "px";
        }

        /*
        let input = menu.querySelector("input:checked");
        if (!input) {
          input = menu.querySelector("input");
        }

        if (input) {
          input.focus();
          input.checked = true;
          input.nextElementSibling.scrollIntoView({
            block: "nearest",
            inline: "nearest",
          });
        }
        */
      } else {
        setOptions(field.props.options || []);
      }
      // evt.stopPropagation();
      setVisible(toVisible);
    },
    [visible, field.props.options],
  );

  /*
  const onFocus = React.useCallback((evt) => {
    const label = evt.target.nextElementSibling;
    label.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);
  */
  // Select when mouse overing the menu.
  const handleMouseOver = React.useCallback((evt) => {
    const pos = evt.clientX + "," + evt.clientY;

    // mouse event was fired by keyboard navigation (scrolling)
    if (lastKeyTime.current && Date.now() - lastKeyTime.current < 250) {
      return;
    }

    if (lastPos.current === pos) {
      return;
    }
    lastPos.current = pos;

    const item = evt.target;
    setSelected(item.dataset.value);
  }, []);

  const handleClick = React.useCallback(() => {
    toggleSelect(false);
    field.value = selected;
  }, [field, selected, toggleSelect]);

  React.useEffect(() => {
    if (!visible) {
      return;
    }

    searchRef.current.focus();

    const keyDown = (evt) => {
      if (evt.key === "Escape" || evt.key === "Enter") {
        setVisible(false);
        evt.preventDefault();
        if (evt.key === "Enter") {
          field.value = selected;
        }
      }

      const first = options[0];
      const last = options[options.length - 1];
      const current = selected
        ? options.find(([key]) => key == selected)
        : null;
      const index = current ? options.indexOf(current) : -1;

      lastKeyTime.current = Date.now();
      if (evt.key === "ArrowDown") {
        if (!selected) {
          setSelected(first[0]);
        } else if (index !== -1) {
          const nextIndex = (index + 1) % options.length;
          const next = options[nextIndex];
          setSelected(next ? next[0] : null);
        }
      } else if (evt.key === "ArrowUp") {
        if (!selected) {
          setSelected(last[0]);
        } else if (index !== -1) {
          const prevIndex = (index - 1 + options.length) % options.length;
          const prev = options[prevIndex];
          setSelected(prev ? prev[0] : null);
        }
      }
    };

    window.addEventListener("keydown", keyDown);
    return () => {
      window.removeEventListener("keydown", keyDown);
    };
  }, [visible, options, selected, field]);

  React.useEffect(() => {
    if (selected) {
      const menu = menuRef.current;
      const li = menu.querySelector("." + styles.selected);
      if (li) {
        li.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [visible, selected]);

  /*
  const tupple =
    options.find(([k, v]) => {
      if (k == field.value) {
        return v;
      }
    }) || [];
  */

  return (
    <div>
      <label
        className={styles.label + " " + styles.mb}
        htmlFor={field.props.id}
      >
        {field.label}
      </label>
      <input type="hidden" name={field.name} value={field.value} readOnly />
      <div
        className={styles.select + " " + (visible && styles.visible)}
        ref={buttonContRef}
      >
        <label className={styles.labelInput}>
          <SearchInput
            key={visible}
            field={field}
            toggleSelect={toggleSelect}
            setOptions={setOptions}
            setVisible={setVisible}
            searchRef={searchRef}
          />
          <span className={styles.end}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1rem"
              height="1rem"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        </label>
        <ul className={styles.selectMenu} onClick={handleClick} ref={menuRef}>
          {options.map(([value, text]) => {
            // const id = field.props.id + "-" + value;
            return (
              <li
                key={value}
                role="option"
                aria-selected={selected == value ? "true" : "false"}
                data-value={value}
                onMouseOver={handleMouseOver}
                className={selected == value ? styles.selected : ""}
              >
                {text}
                {/*
                <input
                  id={id}
                  type="radio"
                  name={field.name}
                  value={value}
                  onChange={field.props.onChange}
                  onBlur={field.props.onBlur}
                />
                <label htmlFor={id}>{text}</label>
              */}
              </li>
            );
          })}
        </ul>
      </div>
      <Error field={field} />
    </div>
  );
}
