import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './styles/App.css';

// Components
import Home from './components/Home/Home';
import Selection from './components/Selection/Selection';
import Game from './components/Game/Game';

function App() {
    return (
        <Router>
            <Switch>
                <Route path="/selection">
                    <Selection />
                </Route>
                <Route
                    path="/game"
                    render={(props) => <Game {...props} />}
                ></Route>
                <Route path="/">
                    <Home />
                </Route>
            </Switch>
        </Router>
    );
}

export default App;
