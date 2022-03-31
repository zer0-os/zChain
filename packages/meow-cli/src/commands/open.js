import os from 'os';
import fs from 'fs';
import path from 'path';
export default {
  command: 'open',

  describe: 'Opens all databases and connections. Listen for replication events',


  /**
   * @param {object} argv
   */
  async handler (argv) {
    console.log('Serving');
  }
}
