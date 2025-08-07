import PropTypes from "prop-types";
import React from "react";

import { GET_INITIAL_STATE, ChatStateManager } from "./lib/state.js";
import { ChatEventsHandler } from "./lib/events.js";
import { Renderer } from "./lib/render/render.js";

export default class Control extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getInitialState();
  }

  static propTypes = {
    forID: PropTypes.string,
  };

  static defaultProps = {};

  init() {
    this.stateManager = new ChatStateManager(this);
    this.eventsHandler = new ChatEventsHandler(this.stateManager);
    this.renderer = new Renderer(this.stateManager, this.eventsHandler);
  }

  getInitialState() {
    return GET_INITIAL_STATE();
  }

  componentDidMount() {
    if (!this.stateManager) {
      this.init();
    }
    this.stateManager.onMount();
  }

  updateValue(value) {
    // Widget does not save to frontmatter
  }

  shouldComponentUpdate(nextProps) {
    // Always call render when the state changes
    return true;
  }

  log(msg, ...args) {
    console.log(msg, ...args);
  }

  render() {
    if (!this.renderer) {
      this.init();
    }
    return this.renderer.render(this.props);
  }
}
