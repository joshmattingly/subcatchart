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
import { Primitive, symbol, svg } from "d3";

interface ChartViewModel{
    dataPoints: ChartDataPoint[];
}

interface ChartDataPoint{
    category: PrimitiveValue;
    subcategory: PrimitiveValue;
    value: PrimitiveValue;
    changeMetric: PrimitiveValue;
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
    };
    
    // walk through the datatree to make sure there's at least one row of data
    
    // if data was found, prepare the full viewModel
    let matrix = dataViews[0].matrix;
    let category = dataViews[0].matrix.rows.root;
    let subcategory = dataViews[0].matrix.rows.root.children[0];

    let chartDataPoints: ChartDataPoint[] = [];
    let dataMaxLocal: number;

    // for each category
    category.children.forEach(function(entry){
        let categoryName = entry.value;

        entry.children.forEach(function(subentry){
            let subCategoryName = subentry.value;
            let xMetricValue = subentry.values[0].value;
            let changeMetricValue = subentry.values[1].value;

            chartDataPoints.push({
                category: categoryName,
                subcategory: subCategoryName,
                value: xMetricValue,
                changeMetric: changeMetricValue
            });
        });
    });
    
    return{
        dataPoints: chartDataPoints,
    };
};        

export class Visual implements IVisual {

    private host: IVisualHost;
    private svg: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private symbol: d3.Symbol<d3.BaseType, any>;
    private chartContainer: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private textValue: d3.Selection<d3.BaseType, any, d3.BaseType, any>;
    private brandContainer: d3.Selection<d3.BaseType, any, d3.BaseType, any>;

    constructor(options: VisualConstructorOptions) {

        // set up the canvas
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('subcatChart', true);

        this.symbol = d3.symbol();

    }

    public update(options: VisualUpdateOptions) {
        let viewModel: ChartViewModel = visualTransform(options, this.host);

        let margin = {top: 10, right: 10, bottom: 10, left: 150};
        let width: number = options.viewport.width - margin.left - margin.right;
        let height: number = options.viewport.height - margin.top - margin.bottom;

        let dataMax = d3.max(viewModel.dataPoints, (d)=>+d.value);
        let increment: number = 3;
        let xScale = d3.scaleLinear()
            .domain([0, dataMax])
            .range([0, width]);

        let categoryList = d3.map(viewModel.dataPoints, (d)=> d.category.toString());

        let yScale = d3.scaleBand()
            .domain(categoryList.keys())
            .range([height, 0])

        // clear out the current view
        this.svg.select(".datapoints").remove();

        this.svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        this.svg
        .append("g")
        .attr("class", "datapoints")
        .selectAll(".points")
        .data(viewModel.dataPoints)
        .enter()
        .append("path")
        .attr("d", this.symbol.size(20).type(d3.symbolTriangle))
        .attr("transform", (d) => "translate(" + xScale(+d.value) + ", " + (yScale(d.category.toString()) + increment) + ")")
        .attr("fill", "steelblue");

    }
}