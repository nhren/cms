﻿var $url = '/pages/plugins/manage';
var $urlReload = '/pages/plugins/manage/actions/reload';

var data = {
  pageLoad: false,
  pageAlert: null,
  pageType: parseInt(utils.getQueryString("pageType") || '1'),
  isNightly: null,
  pluginVersion: null,
  allPackages: null,
  packageIds: null,
  enabledPackages: [],
  disabledPackages: [],
  errorPackages: [],
  updatePackages: [],
  updatePackageIds: [],
  referencePackageIds: []
};

var methods = {
  getIconUrl: function (url) {
    return 'http://plugins.siteserver.cn/' + url;
  },

  load: function () {
    var $this = this;

    $api.get($url).then(function (response) {
      var res = response.data;

      $this.isNightly = res.isNightly;
      $this.pluginVersion = res.pluginVersion;
      $this.allPackages = res.allPackages;
      $this.packageIds = res.packageIds;

      for (var i = 0; i < $this.allPackages.length; i++) {
        var package = $this.allPackages[i];
        if (package.isRunnable && package.metadata) {
          if (package.isDisabled) {
            $this.disabledPackages.push(package);
          } else {
            $this.enabledPackages.push(package);
          }
        } else {
          $this.errorPackages.push(package);
        }
      }

      $apiCloud.get('plugins', {
        isNightly: $this.isNightly,
        pluginVersion: $this.pluginVersion,
        pluginIds: $this.packageIds
      }).then(function (response) {
        var res = response.data;

        for (var i = 0; i < res.value.length; i++) {
          var package = res.value[i];

          var installedPackages = $.grep($this.allPackages, function (e) {
            return e.id == package.pluginInfo.pluginId;
          });
          if (installedPackages.length == 1) {
            var installedPackage = installedPackages[0];
            installedPackage.updatePackage = package;

            if (installedPackage.metadata && installedPackage.metadata.version) {
              if (compareversion(installedPackage.metadata.version, package.releaseInfo.version) == -1) {
                $this.updatePackages.push(installedPackage);
                $this.updatePackageIds.push(installedPackage.id);
              }
            } else {
              $this.updatePackages.push(installedPackage);
              $this.updatePackageIds.push(installedPackage.id);
            }
          }
        }

      }).catch(function (error) {
        this.pageAlert = utils.getPageAlert(error);
      }).then(function () {
        $this.pageLoad = true;
      });

    }).catch(function (error) {
      this.pageAlert = utils.getPageAlert(error);
    });
  },

  enablePackage: function (package) {
    var text = package.isDisabled ? '启用' : '禁用';
    var isReference = this.referencePackageIds.indexOf(package.id) !== -1;
    if (isReference) {
      return swal("无法" + text, "存在其他插件依赖此插件，需要删除依赖插件后才能进行" + text + "操作", "error");
    }
    swal({
      title: text + '插件',
      text: '此操作将会禁用“' + package.id + '”，确认吗？',
      type: 'question',
      showCancelButton: true,
      cancelButtonText: '取 消',
      confirmButtonText: package.isDisabled ? '启 用' : '禁 用'
    }).then(function (result) {
      if (result.value) {
        utils.loading(true);
        $api.post($url + '/' + package.id + '/actions/enable').then(function () {
          utils.loading(false);
          swal({
            type: 'success',
            title: '插件' + text + '成功',
            text: '插件' + text + '成功，系统需要重载页面',
            confirmButtonText: '重新载入'
          }).then(function () {
            window.top.location.reload(true);
          });
        });
      }
    });
  },

  deletePackage: function (package) {
    var isReference = this.referencePackageIds.indexOf(package.id) !== -1;
    if (isReference) {
      return swal("无法删除", "存在其他插件依赖此插件，需要删除依赖插件后才能进行删除操作", "error");
    }
    swal({
        title: '删除插件',
        text: '此操作将会删除“' + package.id + '”，确认吗？',
        type: 'question',
        showCancelButton: true,
        cancelButtonText: '取 消',
        confirmButtonText: '确认删除'
      })
      .then(function (result) {
        if (result.value) {
          utils.loading(true);
          $api.delete($url + '/' + package.id).then(function () {
            utils.loading(false);
            swal({
                type: 'success',
                title: '插件删除成功',
                text: '插件删除成功，系统需要重载页面',
                confirmButtonText: '重新载入'
              })
              .then(function () {
                window.top.location.reload(true);
              });
          });
        }
      });
  },

  btnReload: function () {
    utils.loading(true);
    $api.post($urlReload).then(function () {
      utils.loading(false);
      swal({
        type: 'success',
        title: '插件重新加载成功',
        text: '插件重新加载成功，系统需要重载页面',
        confirmButtonText: '重新载入'
      }).then(function () {
        window.top.location.reload(true);
      });
    });
  }
};

var $vue = new Vue({
  el: '#main',
  data: data,
  methods: methods,
  created: function () {
    this.load();
  }
});