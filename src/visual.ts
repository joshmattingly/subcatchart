/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";
import "@babel/polyfill";
import * as d3 from "d3";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import PrimitiveValue = powerbi.PrimitiveValue;
import ISelectionId = powerbi.visuals.ISelectionId;

import { VisualSettings } from "./settings";

interface ChartViewModel{
    dataPoints: ChartDataPoint[];
    dataMax: number;
}

interface ChartDataPoint{
    category: PrimitiveValue;
    subcategory: PrimitiveValue;
    value: number;
    changeMetric: number;
}

interface ChartSettings{
    enableAxis:{
        show: boolean;
        fill: string;
    };
    generalView:{
        opacity: number;
        showHelpLink: boolean;
        helpLinkColor: string;
    };
}

function visualTransform(options: VisualUpdateOptions, host: IVisualHost): ChartViewModel {
    let dataViews = options.dataViews;
    let defaultSettings: ChartSettings = {
        enableAxis: {
            show: false,
            fill: "#000000",
        },
        generalView:{
            opacity: 100,
            showHelpLink: false,
            helpLinkColor: "#80B0E0",
        }
    };

    let viewModel: ChartViewModel = {
        dataPoints: [],
        dataMax: 0
    };
    
    // walk through the datatree to make sure there's at least one row of data
    if (!dataViews
        ||!dataViews[0].matrix
        ||!dataViews[0].matrix.rows
        ||!dataViews[0].matrix.rows.root
        ||!dataViews[0].matrix.rows.root.children[0].value                          // Category
        ||!dataViews[0].matrix.rows.root.children[0].children[0].value              // Subcategory
        ||!dataViews[0].matrix.rows.root.children[0].children[0].values[0].value    // X-Axis metric
        ||!dataViews[0].matrix.rows.root.children[0].children.values[1].value)       // Change metric
        // if no data, return an empty viewModel
        return viewModel;
    
    // if data was found, prepare the full viewModel
    let matrix = dataViews[0].matrix;
    let category = dataViews[0].matrix.rows.root;
    let subcategory = dataViews[0].matrix.rows.root.children[0];

    let chartDataPoints: ChartDataPoint[] = [];
    let dataMaxLocal: number;

    // for each category
    for(let i = 0, count = category.children.length; i < count; i++){
        let categoryName = category.children[i].value;
        for (let x = 0, count = category.children[i].children.length; x < count; x++){
            let subcategoryName = category.children[i].children[x].value;            
            let xMetricValue = category.children[i].children[x].value[0].value;
            let changeMetricValue = category.children[i].children[x].value[1].value;

            chartDataPoints.push({
                category: categoryName,
                subcategory: subcategoryName,
                value: xMetricValue,
                changeMetric: changeMetricValue
            });
        }
    };

    dataMaxLocal = d3.max(chartDataPoints, (d) => d.value);

    return{
        dataPoints: chartDataPoints,
        dataMax: dataMaxLocal
    };
};        

export class Visual implements IVisual {

    private host: IVisualHost;
    private svg: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private textValue: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private brandContainer: d3.Selection<d3.BaseType, any, d3.BaseType, any>;

    constructor(options: VisualConstructorOptions) {
        // TODO: add options.host

        // set up the canvas
        this.svg = d3.select(options.element)
        .append('svg')
        .classed('subcatChart', true);

        this.brandContainer = this.svg
        .append('g')
        .classed('brandContainer', true);

        this.textValue = this.brandContainer.append("text");
    }

    public update(options: VisualUpdateOptions) {
        let dataView = options.dataViews[0];

        let width: number = options.viewport.width;
        let height: number = options.viewport.height;

        this.textValue
        .text(dataView.matrix.valueSources[1].displayName )
        .attr("x", "50%")
        .attr("y", "50%");

    }
}