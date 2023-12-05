const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const errorContainer = document.getElementById("error-container");
const profileContainer = document.getElementById("profile-container");
const logoutButton = document.getElementById("logout-button");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const response = await fetch("https://01.kood.tech/api/auth/signin", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(
          `${usernameInput.value}:${passwordInput.value}`
        )}`,
      },
    });

    if (response.ok) {
      const token = await response.json();
      localStorage.setItem("jwt_token", token);
      displayProfilePage();
    } else {
      const errorData = await response.json();
      displayError(errorData.error);
    }
  } catch (error) {
    console.error("Login error:", error);
    displayError("Unexpected error on server side.");
  }
});

function displayError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = "block";
}

function displayProfilePage() {
  loginForm.style.display = "none";
  profileContainer.style.display = "block";
  errorContainer.style.display = "none";
  usernameInput.value = "";
  passwordInput.value = "";

  request();
}

function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Make the GraphQL API request
async function request() {
  const query = `
        query {
            user {
                id
                login
                attrs
                totalUp
                totalDown
                createdAt
                updatedAt
                transactions(order_by: { createdAt: asc }) {
                    id
                    userId
                    type
                    amount
                    createdAt
                    path
                }
            }
        }`;

  const endpoint = "https://01.kood.tech/api/graphql-engine/v1/graphql";

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwt_token")}`,
    },
    body: JSON.stringify({ query }),
  })
    .then((response) => response.json())
    .then((result) => {
      const { email, firstName, lastName, phone, city, country } =
        result.data.user[0].attrs;
      const { totalDown, totalUp } = result.data.user[0];
      const transactions = result.data.user[0].transactions;

      let totalXp = 0;
      let pieData = [{ label: "", value: 0 }];
      let lineData = [{ month: "", value: 0 }];
      for (let i = 0; i < transactions.length; i++) {
        const { type, amount, path, createdAt } = transactions[i];
        if (
          type === "xp" &&
          !/piscine-js/.test(path) &&
          !/piscine-go/.test(path)
        ) {
          const date = new Date(createdAt);
          const month = date.toLocaleString("default", { month: "long" });

          totalXp += amount;
          pieData.push({ label: path, value: amount / 1000 });
          lineData.push({ month: month, value: totalXp / 1000 });
        }
      }
      const auditRatio = totalUp / totalDown;
      const auditDone = totalUp / 1000;
      const auditReceived = totalDown / 1000;
      document.getElementById("name").textContent = firstName + " " + lastName;
      document.getElementById("email").textContent = email;
      document.getElementById("from").textContent = city + "," + country;
      document.getElementById("phone").textContent = phone;
      document.getElementById("xp").textContent =
        (totalXp / 1000).toFixed(0) + "kB";
      document.getElementById("audit-done").textContent = `${auditDone.toFixed(
        0
      )} kB`;
      document.getElementById(
        "audit-received"
      ).textContent = `${auditReceived.toFixed(0)} kB`;
      document.getElementById(
        "audit-ratio"
      ).textContent = `${auditRatio.toFixed(1)}`;

      var total = pieData.reduce(function (sum, item) {
        return sum + item.value;
      }, 0);

      var pie_chart = document.getElementById("pie-chart");
      var radius = Math.min(pie_chart.clientWidth, pie_chart.clientHeight) / 2;
      var cx = pie_chart.clientWidth / 2;
      var cy = pie_chart.clientHeight / 2;
      var start = 0;

      var tooltip = document.getElementById("pie-tooltip");

      pieData.forEach(function (item) {
        var slice = (item.value / total) * 360;
        var end = start + slice;
        var x1 = cx + radius * Math.cos((start * Math.PI) / 180);
        var y1 = cy + radius * Math.sin((start * Math.PI) / 180);
        var x2 = cx + radius * Math.cos((end * Math.PI) / 180);
        var y2 = cy + radius * Math.sin((end * Math.PI) / 180);

        var path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute(
          "d",
          `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${
            slice > 180 ? 1 : 0
          },1 ${x2},${y2} Z`
        );
        path.setAttribute("fill", getRandomColor());
        path.addEventListener("mouseover", function (event) {
          var mouseX = event.clientX;
          var mouseY = event.clientY;
          tooltip.style.display = "block";
          tooltip.style.left = mouseX + "px";
          tooltip.style.top = mouseY + "px";
          tooltip.innerHTML = `${item.label}: ${item.value}`;
        });

        path.addEventListener("mouseout", function () {
          tooltip.style.display = "none";
        });

        pie_chart.appendChild(path);
        start = end;
      });

      var width = 400;
      var height = 200;
      var margin = { top: 20, right: 20, bottom: 30, left: 50 };

      var line_chart = d3
        .select("#line-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var xScale = d3.scaleBand().range([0, width]).padding(0.1);
      var yScale = d3.scaleLinear().range([height, 0]);

      var line = d3
        .line()
        .x(function (d) {
          return xScale(d.month);
        })
        .y(function (d) {
          return yScale(d.value);
        });

      xScale.domain(
        lineData.map(function (d) {
          return d.month;
        })
      );
      yScale.domain([
        0,
        d3.max(lineData, function (d) {
          return d.value;
        }),
      ]);

      line_chart
        .append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale));

      line_chart.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

      line_chart
        .append("path")
        .datum(lineData)
        .attr("class", "line")
        .attr("d", line);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("jwt_token");
  displayLoginForm();
});

function displayLoginForm() {
  loginForm.style.display = "block";
  profileContainer.style.display = "none";
  errorContainer.style.display = "none";
}
