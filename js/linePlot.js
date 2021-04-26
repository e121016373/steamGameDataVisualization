class LinePlot {
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 750,
      containerHeight: 500,
      tooltipPadding: 15,
      margin: { top: 40, right: 15, bottom: 75, left: 75 },
    };
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.initVis();
  }

  initVis = () => {
    let vis = this;

    vis.variableToShow = "median";
    vis.searchResults = [];
    vis.tagColors;

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // position a group element according to the given margin config
    vis.plotArea = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.xScale = d3.scaleLinear().range([0, vis.width]);
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    // tracking area for tooltip
    vis.trackingArea = vis.plotArea
      .append("rect")
      .attr("width", vis.width)
      .attr("height", vis.height)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    vis.plot = vis.plotArea.append("g");

    vis.xAxis = d3
      .axisBottom(vis.xScale)
      .tickFormat(d3.format("d"))
      .tickSize(-vis.height)
      .ticks(6)
      .tickPadding(20);
    vis.yAxis = d3
      .axisLeft(vis.yScale)
      .ticks(5)
      .tickPadding(10)
      .tickSize(-vis.width);

    vis.xAxisG = vis.plot
      .append("g")
      .attr("class", "line-plot-axis x-axis")
      .attr("transform", `translate(0, ${vis.height})`);
    vis.yAxisG = vis.plot.append("g").attr("class", "line-plot-axis y-axis");

    vis.tooltip = vis.plotArea
      .append("g")
      .attr("class", "line-plot-tooltip")
      .style("display", "none");

    // line plot title
    vis.svg
      .append("text")
      .attr("class", "line-plot-title")
      .attr("text-anchor", "middle")
      .attr("x", vis.width / 2 + vis.config.margin.left)
      .attr("y", vis.config.margin.top / 2)
      .text("Trend");

    // line plot y-axis title
    vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(0, ${vis.height / 2 + vis.config.margin.top})`
      )
      .append("text")
      .attr("class", "line-plot-axis-title")
      .attr("id", "line-plot-y-axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90)`)
      .attr("dy", "1em")
      .text("Median Number of Ratings");

    // line plot x-axis title
    vis.svg
      .append("text")
      .attr("class", "line-plot-axis-title")
      .attr("text-anchor", "middle")
      .attr("x", vis.width / 2 + vis.config.margin.left)
      .attr("y", vis.height + vis.config.margin.top + vis.config.margin.bottom)
      .text("Year");

    // prepare data
    vis.allData = Array.from(vis.data.entries())
      .map((dataByYear) => {
        return Array.from(dataByYear[1]).map((games) => {
          return {
            year: +dataByYear[0],
            ...games[1],
          };
        });
      })
      .flat()
      .sort((a, b) => a.year - b.year);

    // Setup Flex Search and add tags into search index
    vis.searchIndex = new FlexSearch();
    vis.tags = [...new Set(vis.allData.map((d) => d.name))];
    vis.tags.forEach((tag) => {
      vis.searchIndex.add(tag, tag);
    });

    // Setup Tag filter data
    vis.tagFilterData = vis.allData
      .filter((d) => d.year === 2018)
      .sort((a, b) => b.medianRatingCount - a.medianRatingCount);
    vis.tagFilter = vis.tagFilterData.slice(0, 5).map((d) => d.name);

    // Tag filter
    vis.tagFilterContainer = d3.select("#tag-filter");

    // Tag Search bar
    vis.tagSearchBar = vis.tagFilterContainer
      .append("input")
      .attr("type", "text")
      .attr("id", "tag-search")
      .attr("placeholder", "Search for Tags");

    vis.tagItems = vis.tagFilterContainer
      .append("div")
      .attr("id", "tag-filter-items")
      .attr("class", "tag-filter-items");
  };

  updateVis = () => {
    let vis = this;

    if (vis.tagFilter.length > 0) {
      // filter data if tag is selected
      vis.filteredData = vis.allData.filter((d) =>
        vis.tagFilter.includes(d.name)
      );
    } else {
      // include all tags when no tag is selected
      vis.filteredData = vis.allData;
    }
    vis.groupedData = d3.groups(vis.filteredData, (d) => d.name);

    // update x and y axes
    vis.xValue = (d) => d.year;
    vis.yValue = (d) =>
      vis.variableToShow === "median" ? d.medianRatingCount : d.numGames;

    vis.xScale.domain(d3.extent(vis.filteredData, vis.xValue));
    vis.yScale.domain([0, d3.max(vis.filteredData, vis.yValue)]);

    // search bar event handler
    vis.tagSearchBar.on("keyup", async (event, d) => {
      const searchText = d3.select("#tag-search").property("value");
      const results = await vis.searchIndex.search(searchText);
      vis.dispatcher.call("tagSearch", event, results);
    });

    // sort tags
    vis.tags = this.sortTags(vis.tagFilterData, vis.variableToShow).map(
      (d) => d.name
    );

    vis.renderVis();
  };

  renderVis = () => {
    let vis = this;

    // render line path
    const plotG = vis.plot.selectAll(".line-plot-line").data(vis.groupedData);

    plotG
      .join("path")
      .attr("class", "line-plot-line")
      .attr("id", (d) => `line-plot-line-${this.formatString(d[0])}`)
      .attr("tag-line-name", (d) => d[0])
      .attr("d", (d) => {
        if (vis.tagFilter.length > 0)
          return d3
            .line()
            .x((d) => vis.xScale(vis.xValue(d)))
            .y((d) => vis.yScale(vis.yValue(d)))(d[1]);
      })
      .attr("stroke", (d) => {
        return getCategoryColor(tagCategoryMap.get(d[0]));
      })
      .attr("fill", "none")
      .attr("stroke-width", 3)
      .attr("opacity", (d) => {
        return this.getOpacity(d[0], vis.tagFilter);
      })
      .on("click", (event, d) => {
        const selectedLine = d3.select(
          `#line-plot-line-${this.formatString(d[0])}`
        );
        if (highlightedTag === d[0]) {
          selectedLine
            .attr("stroke", getCategoryColor(tagCategoryMap.get(d[0])))
            .attr("opacity", (d) => {
              return this.getOpacity(d[0], vis.tagFilter);
            });
        } else if (highlightedTag === null || highlightedTag === undefined) {
          selectedLine.attr("stroke", "yellow");
        } else {
          d3.select(`#line-plot-line-${this.formatString(highlightedTag)}`)
            .attr(
              "stroke",
              getCategoryColor(tagCategoryMap.get(highlightedTag))
            )
            .attr("opacity", (d) =>
              this.getOpacity(highlightedTag, vis.tagFilter)
            );
          selectedLine.attr("stroke", "yellow");
        }
        vis.dispatcher.call("lineplotClick", event, d);
      })
      .on("mouseover", (event, d) => {
        d3.select(`#line-plot-line-${this.formatString(d[0])}`).attr(
          "stroke-width",
          5
        );
      })
      .on("mouseleave", (event, d) => {
        d3.select(`#line-plot-line-${this.formatString(d[0])}`).attr(
          "stroke-width",
          3
        );
      });

    plotG.exit().remove();

    vis.trackingArea
      .on("mouseenter", () => vis.tooltip.style("display", "block"))
      .on("mousemove", (event) => {
        this.renderTooltip(event, vis);
      })
      .on("mouseleave", () => {
        // remove tooltip
        vis.tooltip.style("display", "none");
        d3.select("#tooltip").style("display", "none");
      });

    // create tooltip circles
    const tooltipCircles = vis.tooltip
      .selectAll(".tooltip-circles")
      .data(vis.groupedData);
    const tooltipText = vis.tooltip
      .selectAll(".tooltip-text")
      .data(vis.groupedData);

    tooltipCircles
      .join("circle")
      .attr("class", "tooltip-circles")
      .attr("id", (d) => `tooltip-circle-${this.formatString(d[0])}`)
      .attr("r", 4)
      .attr("fill", (d) => getCategoryColor(tagCategoryMap.get(d[0])))
      .attr("opacity", 0);

    tooltipText
      .join("text")
      .attr("class", "tooltip-text")
      .attr("id", (d) => `tooltip-text-${this.formatString(d[0])}`)
      .attr("opacity", 0);

    tooltipCircles.exit().remove();
    tooltipText.exit().remove();

    // render tag filter checkbox
    const searchText = d3.select("#tag-search").property("value");
    const tagFilter = vis.tagItems
      .selectAll(".tag-filter-div")
      .data(searchText.length == 0 ? vis.tags : vis.searchResults, (d) => [d]);

    const tagFilterEnter = tagFilter
      .join("div")
      .attr("class", "tag-filter-div")
      .attr("id", (d) => `tag-filter-div-${this.formatString(d)}`);

    const tagFilterInput = tagFilterEnter.selectAll("input").data((d) => [d]);
    const tagFilterLabel = tagFilterEnter.selectAll("label").data((d) => [d]);
    const tagFilterCheckbox = tagFilterEnter
      .selectAll(".checkmark")
      .data((d) => [d]);

    tagFilterInput
      .join("input")
      .attr("type", "checkbox")
      .attr("value", (d) => d)
      .attr("checked", (d) => {
        if (vis.tagFilter.includes(d)) {
          d3.select(`#tag-filter-input-${this.formatString(d)}`).property(
            "checked",
            true
          );
          return true;
        } else {
          d3.select(`#tag-filter-input-${this.formatString(d)}`).property(
            "checked",
            false
          );
          return null;
        }
      })
      .attr("id", (d) => `tag-filter-input-${this.formatString(d)}`);

    tagFilterCheckbox
      .join("span")
      .attr("class", "checkmark")
      .attr("id", (d) => `checkmark-${this.formatString(d)}`)
      .style("background-color", (d) => {
        if (vis.tagFilter.includes(d)) {
          return getCategoryColor(tagCategoryMap.get(d));
        } else {
          return "#eee";
        }
      })
      .style("opacity", (d) => {
        return this.getOpacity(d, vis.tagFilter);
      })
      .on("click", (event, d) => {
        const isChecked = d3
          .select(`#tag-filter-input-${this.formatString(d)}`)
          .property("checked");

        if (isChecked) {
          d3.select(`#checkmark-${this.formatString(d)}`).style(
            "background-color",
            "#eee"
          );
        } else {
          d3.select(`#checkmark-${this.formatString(d)}`)
            .style("background-color", getCategoryColor(tagCategoryMap.get(d)))
            .style("opacity", (d) => {
              return this.getOpacity(d, vis.tagFilter);
            });
        }

        vis.dispatcher.call("tagFilter", event, d, !isChecked);
      })
      .on("mouseover", (event, d) => {
        d3.select(`#checkmark-${this.formatString(d)}`).style(
          "filter",
          "brightness(75%)"
        );
      })
      .on("mouseleave", (event, d) => {
        d3.select(`#checkmark-${this.formatString(d)}`).style(
          "filter",
          "brightness(100%)"
        );
      });

    tagFilterLabel
      .join("label")
      .join("text")
      .text((d) => d);

    tagFilter.exit().remove();

    // reset event handler
    d3.select("#reset-button").on("click", (event, d) => {
      vis.dispatcher.call(
        "tagReset",
        event,
        vis.variableToShow,
        vis.tagFilterData
      );
    });

    // clear event handler
    d3.select("#clear-button").on("click", (event, d) => {
      vis.dispatcher.call("tagClear", event);
    });

    // update axes
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  };

  // sort tags in descending order based on the selected variable
  sortTags = (tagFilterData, variable) => {
    return tagFilterData.sort((a, b) => {
      if (variable === "median") {
        if (b.medianRatingCount > a.medianRatingCount) return 1;
        if (b.medianRatingCount < a.medianRatingCount) return -1;
        return 0;
      } else {
        if (b.numGames > a.numGames) return 1;
        if (b.numGames < a.numGames) return -1;
        return 0;
      }
    });
  };

  // return a string that contains number and letters only
  formatString = (str) => {
    return (str = str.replace(/[^a-zA-Z0-9]/g, ""));
  };

  // render tooltip
  renderTooltip = (event, vis) => {
    let year = vis.xScale.invert(event.pageX - 100);
    year = Math.round(year);

    let tooltipInfo = [];
    vis.groupedData.forEach((group) => {
      const targetYear = group[1].filter((d) => d.year === year);
      if (targetYear.length > 0) {
        targetYear.forEach((d) => {
          tooltipInfo.push({
            tag: d.name,
            value:
              vis.variableToShow === "median"
                ? d.medianRatingCount
                : d.numGames,
          });

          // move circle
          vis.tooltip
            .select(`#tooltip-circle-${this.formatString(d.name)}`)
            .attr("opacity", 1)
            .attr("transform", () => {
              return `translate(${vis.xScale(d.year)}, ${vis.yScale(
                vis.variableToShow === "median"
                  ? d.medianRatingCount
                  : d.numGames
              )})`;
            });
        });
      } else {
        vis.tooltip
          .select(`#tooltip-circle-${this.formatString(group[0])}`)
          .attr("opacity", 0);
      }

      let htmlCode = `
      <div class="tooltip-title"><b>Year: ${year}</b></div>
      <div>
        <ul class="tooltip-list">
        ${tooltipInfo
          .sort((a, b) => b.value - a.value)
          .map((d) => {
            return `<li style="color:${getCategoryColor(
              tagCategoryMap.get(d.tag)
            )}; opacity:${this.getOpacity(d.tag, vis.tagFilter)}">${d.tag}: ${
              d.value
            }</li>`;
          })}
        </ul>
      </div>
      `;
      htmlCode = htmlCode.replaceAll(",", "");
      d3.select("#tooltip")
        .style("display", "block")
        .html(htmlCode)
        .style("left", vis.xScale(year) + vis.config.tooltipPadding * 7 + "px")
        .style("top", event.pageY + vis.config.tooltipPadding + "px");
    });
  };

  // get the top five tags based on the selected variable
  getTopFive = (data, variable) => {
    if (variable === "median") {
      return data
        .filter((d) => d.year === 2018)
        .sort((a, b) => b.medianRatingCount - a.medianRatingCount)
        .slice(0, 5)
        .map((d) => d.name);
    } else {
      return data
        .filter((d) => d.year === 2018)
        .sort((a, b) => b.numGames - a.numGames)
        .slice(0, 5)
        .map((d) => d.name);
    }
  };

  // returns the opacity for tags that are in the same cluster. 
  // NOTE: The ones that are selected later will get lower opacity in order to better differentiate lines in the same color
  getOpacity = (tagName, tagFilter) => {
    const color = getCategoryColor(tagCategoryMap.get(tagName));

    // get ranking
    let rank = 0;
    for (let tag of tagFilter) {
      const color2 = getCategoryColor(tagCategoryMap.get(tag));
      if (color === color2) rank++;
      if (tag === tagName) break;
    }
    return Math.max(0.4, 1 - 0.2 * (rank - 1));
  };
}
