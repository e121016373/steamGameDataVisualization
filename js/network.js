class Network {
  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: 1000,
      containerHeight: 1000,
      margin: { top: 50, right: 25, bottom: 25, left: 25 },
    };
    this.data = _data;
    this.initVis();
  }

  /**
   * We initialize the arc generator, scales, axes, and append static elements
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width =
      vis.config.containerWidth -
      vis.config.margin.left -
      vis.config.margin.right;
    vis.height =
      vis.config.containerHeight -
      vis.config.margin.top -
      vis.config.margin.bottom;

    vis.radiusValue = (d) => Math.log2(d.numGames) * 4;

    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append("svg")
      .attr("width", vis.config.containerWidth)
      .attr("height", vis.config.containerHeight);

    // Append group element that will contain our actual chart
    // and position it according to the given margin config
    vis.chartArea = vis.svg
      .append("g")
      .attr(
        "transform",
        `translate(${vis.config.margin.left},${vis.config.margin.top})`
      );

    vis.svg
      .append("text")
      .attr("class", "network-graph-title")
      .attr("text-anchor", "middle")
      .attr("x", vis.config.containerWidth / 2)
      .attr("y", 30)
      .text("Tag Relationships");

    //Extract data from dataset
    var nodeData = vis.data.nodes;
    var linkData = vis.data.links;

    //Create Force Layout
    var force = d3
      .forceSimulation(nodeData)
      .force("center", d3.forceCenter(vis.width / 2, vis.height / 2))
      .force("link", d3.forceLink().links(linkData))
      .force("charge", d3.forceManyBody().strength(-600))
      .force(
        "collision",
        d3.forceCollide().radius(function (d) {
          return vis.radiusValue(d) + 2;
        })
      );

    //Add links to SVG
    var links = vis.chartArea
      .selectAll(".link")
      .data(linkData)
      .enter()
      .append("line")
      .attr("stroke-width", function (d) {
        if (Math.log(d.weight) > 2.3) {
          return Math.log(d.weight);
        } else {
          // Width of lines with weight under 10 is 0.5
          return 0.5;
        }
      })
      .attr("class", "link");

    var drag = (force) => {
      function dragstarted(event) {
        if (!event.active) force.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) force.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    //Add nodes to SVG
    var nodes = vis.chartArea
      .selectAll(".node")
      .data(nodeData)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(drag(force));

    //Add circles to each node
    var circles = nodes
      .append("circle")
      .attr("r", function (d) {
        if (vis.radiusValue(d) > 5) {
          return vis.radiusValue(d);
        } else {
          return 5;
        }
      })
      .attr("stroke-width", function (d) {
        if (vis.radiusValue(d) / 5 > 2) {
          return vis.radiusValue(d) / 5;
        } else {
          return 2;
        }
      })
      .attr("tag-circle-name", (d) => d.name)
      .attr("fill", (d) => getCategoryColor(d.category))
      .on("mouseover", (event, d) => {
        d3
          .select("#tooltip")
          .style("display", "block")
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY + 15 + "px").html(`
        <div class="tooltip-title">${d.name}</div>
        <ul>
          <li>Median Number of Ratings: ${d.medianRatingCount}</li>
          <li>Number of Games: ${d.numGames}</li>
        </ul>
        `);
      })
      .on("mouseleave", () => {
        d3.select("#tooltip").style("display", "none");
      })
      .on("click", function (event, d) {
        // Select new tag when no tag is selected
        if (highlightedTag == null) {
          highlightedTag = d.name;
          d3.select("[tag-circle-name='" + d.name + "']").attr(
            "stroke",
            "#f2ff00"
          );
          d3.select("[tag-line-name='" + d.name + "']")
            .attr("stroke", "#f2ff00")
            .attr("stroke-width", "5");
        }
        // Deselect selected tag
        else if (highlightedTag === d.name) {
          highlightedTag = null;
          d3.select("[tag-circle-name='" + d.name + "']").attr(
            "stroke",
            "none"
          );
          d3.select("[tag-line-name='" + d.name + "']")
            .attr("stroke", getCategoryColor(tagCategoryMap.get(d.name)))
            .attr("stroke-width", "3");
        }
        // Deselect old selected tag and select new tag
        else {
          d3.select("[tag-circle-name='" + highlightedTag + "']").attr(
            "stroke",
            "none"
          );
          d3.select("[tag-line-name='" + highlightedTag + "']")
            .attr(
              "stroke",
              getCategoryColor(tagCategoryMap.get(highlightedTag))
            )
            .attr("stroke-width", "3");

          highlightedTag = d.name;
          d3.select("[tag-circle-name='" + d.name + "']").attr(
            "stroke",
            "#f2ff00"
          );
          d3.select("[tag-line-name='" + d.name + "']")
            .attr("stroke", "#f2ff00")
            .attr("stroke-width", "5");
        }
      });

    //Add labels to each node
    nodes
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text(function (d) {
        return d.name;
      })
      .attr("font-weight", 700)
      .attr("font-size", function (d) {
        var diameter, radius, textWidth, xPadding, availableWidth;

        if (vis.radiusValue(d) > 5) {
          radius = vis.radiusValue(d);
        } else {
          radius = 5;
        }
        diameter = 2 * radius;
        xPadding = 3;
        availableWidth = diameter - 2 * xPadding;

        textWidth = this.getComputedTextLength();

        return availableWidth / textWidth + "em";
      });

    force.on("tick", function () {
      //Set x,y of nodes
      nodes
        .attr("r", function (d) {
          if (vis.radiusValue(d) > 5) {
            return vis.radiusValue(d);
          } else {
            return 5;
          }
        })
        .attr("cx", function (d) {
          return (d.x = Math.max(
            vis.radiusValue(d),
            Math.min(vis.width - vis.radiusValue(d), d.x)
          ));
        })
        .attr("cy", function (d) {
          return (d.y = Math.max(
            vis.radiusValue(d),
            Math.min(vis.height - vis.radiusValue(d), d.y)
          ));
        });
      //Set x,y of links
      links
        .attr("x1", function (d) {
          return d.source.x;
        })
        .attr("y1", function (d) {
          return d.source.y;
        })
        .attr("x2", function (d) {
          return d.target.x;
        })
        .attr("y2", function (d) {
          return d.target.y;
        });
      nodes.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    });
  }
}
