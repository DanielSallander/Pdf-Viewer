/**
 * Interface for PDF View settings.
 *
 * @interface
 * @property {{showHeader:boolean,scrollOverflow:boolean}} pdfViewerSettings
*/
export interface PDFViewSettings {
    pdfViewerSettings: {
      showHeader: boolean;
      scrollOverflow: boolean;
    };
  }

export class FormatConfiguration {

    public pdfViewSettings: PDFViewSettings;

    public getFormatConfiguration(pdfViewSettings: PDFViewSettings): powerbi.visuals.FormattingModel {

        const dataCard: powerbi.visuals.FormattingCard = {
            description: "PDF Viewer Settings",
            displayName: "Settings",
            uid: "dataCard_uid",
            groups: [],
            revertToDefaultDescriptors: [
              {
                  objectName: "dataCard",
                  propertyName:"showHeader"
              },
              {
                  objectName: "dataCard",
                  propertyName: "scrollOverflow"
              }
          ]
        }
    
        const showHeader_group: powerbi.visuals.FormattingGroup = {
          displayName: "Viewer Settings",
          uid: "dataCard_showHeader_group_uid",
          slices: [
              {
                uid: "showHeaderCard_topLevelToggle_showToggleSwitch_uid",
                displayName: "Show Header",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "dataCard",
                      propertyName: "showHeader"
                    },
                    value: pdfViewSettings.pdfViewerSettings.showHeader
                  }
                }
              },
              {
                uid: "scrollOverflowCard_topLevelToggle_showToggleSwitch_uid",
                displayName: "Scroll Overflow",
                control: {
                  type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                  properties: {
                    descriptor: {
                      objectName: "dataCard",
                      propertyName: "scrollOverflow"
                    },
                    value: pdfViewSettings.pdfViewerSettings.scrollOverflow
                  }
                }
              }]
            }
    
        dataCard.groups.push(showHeader_group);
    
        const formattingModel: powerbi.visuals.FormattingModel = { cards: [dataCard] };
    
        return formattingModel;
        }

}