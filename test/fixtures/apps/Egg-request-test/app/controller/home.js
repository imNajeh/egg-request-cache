'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, ' + this.app.plugins['request-cache'].name;
  }

  async request() {
    const result = await this.app.curl('http://registry.npm.taobao.org/', { dataType: 'json' });
    this.ctx.body = result.res.data;
  }

  async requestCache() {
    const result = await this.app.requestCache('http://registry.npm.taobao.org/', { dataType: 'json' });
    this.ctx.body = result;
  }

  async requestRandom() {
    const result = await this.app.requestCache('http://test.com/a', { dataType: 'json', noCache: false });
    this.ctx.body = result;
  }

  async requestRandomNoCache() {
    const result = await this.app.requestCache('http://test.com/a', { dataType: 'json', noCache: true });
    this.ctx.body = result;
  }
}

module.exports = HomeController;
