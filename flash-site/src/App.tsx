import { PrimeReactProvider } from "primereact/api";
import { ThemeProvider } from "./themes/Theme";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import { Main } from "./pages/main/Main";

function App() {
  return (
    <PrimeReactProvider>
      <ThemeProvider>
        <Main />
      </ThemeProvider>
    </PrimeReactProvider>
  );
}

export default App;
