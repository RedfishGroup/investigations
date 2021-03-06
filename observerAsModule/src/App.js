import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import HeadsUpDisplayTest from "./Test.js";
import { Provider } from "react-redux";
import store from "../node_modules/earthruntime/src/redux/store.js";

class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <p className="App-intro">
            To get started, edit <code>src/App.js</code> and save to reload.
          </p>
          <HeadsUpDisplayTest />
        </div>
      </Provider>
    );
  }
}

export default App;
