// import './app.css'
import { Tab, TabbedPane } from "./components/tabbed-pane.tsx";
import { JSONFormatter } from "./lang/json.tsx";
import { SQLFormatter } from "./lang/sql.tsx";
import { PromQLFormatter } from "./lang/promql.tsx";
import { LogFormatter } from "./lang/log.tsx";
import { DiffPane } from "./lang/diff.tsx";
import { ErrorReport } from "./components/error-report.tsx";

export function App() {
  return (
    <>
      <ErrorReport />
      <TabbedPane>
        <Tab id={"json"} title={"JSON Formatter"} keybind={"j"}>
          <JSONFormatter />
        </Tab>
        <Tab id={"sql"} title={"SQL Formatter"} keybind={"s"}>
          <SQLFormatter />
        </Tab>
        <Tab id={"prom"} title={"MetricsQL Formatter"} keybind={"m"}>
          <PromQLFormatter />
        </Tab>
        <Tab id={"diff"} title={"Difference"} keybind={"d"}>
          <DiffPane />
        </Tab>
        <Tab id={"log"} title={"Log Formatter"} keybind={"l"}>
          <LogFormatter />
        </Tab>
      </TabbedPane>
    </>
  );
}
