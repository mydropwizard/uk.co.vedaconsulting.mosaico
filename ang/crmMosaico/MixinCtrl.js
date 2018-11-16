(function(angular, $, _) {

  // This provides additional actions for editing a Mosaico mailing.
  // It coexists with crmMailing's EditMailingCtrl.
  angular.module('crmMosaico').controller('CrmMosaicoMixinCtrl', function CrmMosaicoMixinCtrl($scope, dialogService, crmMosaicoTemplates, crmStatus, CrmMosaicoIframe, $timeout) {
    // var ts = $scope.ts = CRM.ts(null);

    // Main data is in $scope.mailing, $scope.mosaicoCtrl.template

    var crmMosaicoIframe = null;

    // Hrm, would like `ng-controller="CrmMosaicoMixinCtrl as mosaicoCtrl`, but that's not working...
    $scope.mosaicoCtrl = {
      templates: [],
      // Fill a given "mailing" which the chosen "template".
      select: function(mailing, template) {
        var topt = mailing.template_options = mailing.template_options || {};
        var promise = crmMosaicoTemplates.getFull(template).then(function(tplCtnt){
          topt.mosaicoTemplate = template.id;
          topt.mosaicoMetadata = tplCtnt.metadata;
          topt.mosaicoContent = tplCtnt.content;
          mailing.body_html = tplCtnt.html;
          // console.log('select', {isAr1: _.isArray(mailing.template_options), isAr2: _.isArray(topt), m: mailing, t: template});
          $scope.mosaicoCtrl.edit(mailing);
        });
        return crmStatus({start: ts('Loading...'), success: null}, promise);
      },
      // Figure out which "template" was previously used with a "mailing."
      getTemplate: function(mailing) {
        if (!mailing || !mailing.template_options || !mailing.template_options.mosaicoTemplate) {
          return null;
        }
        var matches = _.where($scope.mosaicoCtrl.templates, {
          id: mailing.template_options.mosaicoTemplate
        });
        return matches.length > 0 ? matches[0] : null;
      },
      // Reset all Mosaico data in a "mailing'.
      reset: function(mailing) {
        if (crmMosaicoIframe) crmMosaicoIframe.destroy();
        crmMosaicoIframe = null;
        delete mailing.template_options.mosaicoTemplate;
        delete mailing.template_options.mosaicoMetadata;
        delete mailing.template_options.mosaicoContent;
        mailing.body_html = '';
      },
      // Edit a mailing in Mosaico.
      edit: function(mailing) {
        if (crmMosaicoIframe) {
          crmMosaicoIframe.show();
          return;
        }

        function syncModel(viewModel) {
          mailing.body_html = viewModel.exportHTML();
          mailing.template_options = mailing.template_options || {};
          // Mosaico exports JSON. Keep their original encoding... or else the loader throws an error.
          mailing.template_options.mosaicoMetadata = viewModel.exportMetadata();
          mailing.template_options.mosaicoContent = viewModel.exportJSON();
          /*
          Fix to display mailing subject instead of "TITLE"
          Note that we're not validating subject since is a required field
          and there is only one "TITLE" in the template
           */
          mailing.body_html = mailing.body_html.replace("TITLE", mailing.subject);
        }

        crmMosaicoIframe = new CrmMosaicoIframe({
          model: {
            template: $scope.mosaicoCtrl.getTemplate(mailing).path,
            metadata: mailing.template_options.mosaicoMetadata,
            content: mailing.template_options.mosaicoContent
          },
          actions: {
            close: function(ko, viewModel) {
              viewModel.metadata.changed = Date.now();
              syncModel(viewModel);
              // TODO: When autosave is better integrated, remove this.
              $timeout(function(){$scope.save();}, 100);
              crmMosaicoIframe.hide('crmMosaicoEditorDialog');
            },
            test: function(ko, viewModel) {
              syncModel(viewModel);

              var model = {mailing: $scope.mailing, attachments: $scope.attachments};
              var options = CRM.utils.adjustDialogDefaults(angular.extend(
                {autoOpen: false, title: ts('Preview/ Test'), width: 550},
                options
              ));
              var pr = dialogService.open('crmMosaicoPreviewDialog', '~/crmMosaico/PreviewDialogCtrl.html', model, options);
              return pr;
            }
          }
        });

        return crmStatus({start: ts('Loading...'), success: null}, crmMosaicoIframe.open());
      }
    };

    // Open a dialog of advanced options.
    $scope.openAdvancedOptions = function() {
      var model = {mailing: $scope.mailing, attachments: $scope.attachments};
      var options = CRM.utils.adjustDialogDefaults(angular.extend(
        {
          autoOpen: false,
          title: ts('Advanced Settings'),
          width: 600,
          height: 'auto'
        },
        options
      ));
      return dialogService.open('crmMosaicoAdvancedDialog', '~/crmMosaico/AdvancedDialogCtrl.html', model, options);
    };

    crmMosaicoTemplates.whenLoaded().then(function(){
      $scope.mosaicoCtrl.templates = crmMosaicoTemplates.getAll();
    });

    $scope.$on("$destroy", function() {
      if (crmMosaicoIframe) {
        crmMosaicoIframe.destroy();
        crmMosaicoIframe = null;
      }
    });

  });

})(angular, CRM.$, CRM._);
