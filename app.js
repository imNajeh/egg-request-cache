'use strict';
const md5 = require('md5');
let instance;
let cache = {};

// 格式化响应体
function transformResponse(ctx) {
  return ctx.res.data;
}

// 构造函数 统一处理通用的逻辑
function constructor(defOpts = {}) {
  // 返回一个请求函数
  return async function(url, conf) {
    // 开始时间
    const startTime = Date.now();
    let response;
    const params = Object.assign({}, defOpts, conf);
    const cacheKey = createIndexes(url, params);
    // 读取缓存
    response = await getCache(cacheKey);
    // 无缓存则请求且写入缓存
    if (!response) {
      response = await instance.curl(url, params);
      setCache(cacheKey, response);
    }
    response = transformResponse(response);
    // 结束时间
    console.log('此次请求花费时间：', Date.now() - startTime);
    return response;
  };
}

// {test: 1, testB: 2} => MD5
function createIndexes(url, params) {
  let keys = Object.keys(params);
  keys = keys.sort(); // 防止因为key顺序问题导致认为不是同一个请求
  let strs = '';
  keys.forEach(key => {
    strs += `${key}${params[key]}`;
  });
  return md5(strs);
}

// 保存数据
function setCache(key, val) {
  if (instance.redis) {
    if (typeof val === 'object') val = JSON.stringify(val);
    instance.redis.set(instance.config.requestCache.redisPrefixKey + ':' + key, val, 'EX', (instance.config.requestCache.expireTime / 1000));
  } else {
    cache[key] = {
      value: val,
      expireTime: Date.now() + instance.config.requestCache.expireTime,
    };
  }
}

// 获取缓存
async function getCache(key) {
  if (instance.redis) {
    const val = await instance.redis.get(instance.config.requestCache.redisPrefixKey + ':' + key);
    return JSON.parse(val);
  }
  if (cache[key] && cache[key].expireTime < Date.now()) {
    delete cache[key];
  }
  return cache[key] && cache[key].value;
}

// 清理缓存
async function clearExpireCache() {
  const keys = Object.keys(cache);
  keys.forEach(key => {
    if (cache[key].expireTime < Date.now()) {
      delete cache[key];
    }
  });
}

// 暴露的Api
const requestCache = constructor();
requestCache.get = constructor({
  method: 'GET',
  dataType: 'json',
});
requestCache.post = constructor({
  method: 'POST',
  dataType: 'json',
});

// 插件初始化
module.exports = app => {
  instance = app;
  app.requestCache = requestCache;
  app.config.requestCache = Object.assign({
    expireTime: 5000, // 默认一分钟缓存
    redisPrefixKey: 'requestcache', // 默认一分钟缓存
  }, app.config.requestCache);
  app.coreLogger.info('[egg-request] init instance success!');

  // 五秒清理一次缓存
  const timer = setInterval(clearExpireCache, 5000);
  app.beforeClose(async () => {
    clearInterval(timer);
  });
};
