<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ANET</title>

    <!-- Bootstrap -->
    <link href="/assets/css/bootstrap.css" rel="stylesheet">
    <link href="/assets/css/bootstrap-theme.css" rel="stylesheet">

    <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
  </head>
  <body>
    <nav>
      <div class="container-fluid">
        <div class="navbar-header">
          <a class="navbar-brand" href="#">
            <img alt="ANET" src="/img/anet.jpg">
          </a>
        </div>
      </div><!-- /.container-fluid -->

      <ul>
        <li><a href="/search">ANET Search</a></li>
        <li><a href="/search">Submit a Report</a></li>
        <li><a href="/search">Your Reports &amp; Approvals</a></li>
        <li><a href="/search">Report Analytics</a></li>
        <hr>
        <li><a href="/search">Advisor Analytics</a></li>
        <hr>
        <li><a href="/search">ANET Training</a></li>
      </ul>

      <form class="navbar-form navbar-left">
        <div class="form-group">
          <input type="text" class="form-control" placeholder="Search">
        </div>
        <button type="submit" class="btn btn-default">Submit</button>
      </form>
    </nav>

    <form>
      <div>
        Submitting as {{currentUser.name}}
        <input type="submit" value="Submit" class="btn btn-default pull-right">
      </div>

      <section class="anet-block">
        <div class="anet-block__title">
          Report Details
        </div>

        <div class="anet-block__body">
          <div class="form-group">
            <label for="engagementIntent">Intent of Engagement</label>
            <textarea id="engagementIntent"></textarea>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label for="afghanPrincipal">Afghan Principal Name (or TASHKIL)</label>
                <select id="afghanPrincipal"></select>
              </div>

              <div class="form-group">
                <label for="engagementDate">Engagement Date</label>
                <input id="engagementDate" type="date">
              </div>
            </div>

            <div class="col-md-6">
              <div class="form-group">
                <label for="engagementLocation">Engagement Location</label>
                <input id="engagementLocation">
              </div>

              <div class="form-group">
                <label for="affectedOrgs">Affected Advising Orgs</label>
                <select id="affectedOrgs"></select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="anet-block">
        <div class="anet-block__title">
          Discussion
        </div>

        <div class="anet-block__body">
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label for="engagementAtmosphere">Atmosphere of Engagement</label>
                <select id="engagementAtmosphere">
                  <option>Positive</option>
                  <option>Neutral</option>
                  <option>Negative</option>
                </select>
              </div>
            </div>

            <div class="col-md-6">
              <div class="form-group">
                <label for="engagementAtmosphereDetails">Atmospheric Details</label>
                <input id="engagementAtmosphereDetails">
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="engagementDetails">Describe the discussion in detail</label>
            <textarea id="engagementDetails"></textarea>
          </div>

          <div class="form-group">
            <label for="engagementNextSteps">Recommended next steps?</label>
            <textarea id="engagementNextSteps"></textarea>
          </div>
        </div>
      </section>

      <section class="anet-block">
        <div class="anet-block__title">
          Other Stakeholders
        </div>

        <div class="anet-block__body">
          <div class="row">
            <div class="col-md-6">
              <form class="anet-attach-person">
                <div class="form-group">
                  <label for="attachPersonName">Name of Individual</label>
                  <input id="attachPersonName">
                </div>

                <div class="form-group">
                  <input type="radio" value="advisor" name="attachPersonType" id="attachPersonTypeAdvisor">
                  <label for="attachPersonTypeAdvisor">Advisor</label>
                  <input type="radio" value="principal" name="attachPersonType" id="attachPersonTypePrincipal">
                  <label for="attachPersonTypePrincipal">Afghan Principal</label>
                  <input type="radio" value="other" name="attachPersonType" id="attachPersonTypeOther">
                  <label for="attachPersonTypeOther">Other</label>
                </div>

                <div class="form-group">
                  <label for="attachPersonGroup">Organizational Group</label>
                  <select id="attachPersonGroup"></select>
                </div>

                <div class="form-group">
                  <input type="submit" value="Add Person" class="btn btn-default pull-right">
                </div>
              </form>
            </div>

            <div class="col-md-6">
              <table>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Org</th>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="anet-block">
        <div class="anet-block__title">
          Essential Functions and Milestones
        </div>

        <div class="anet-block__body">
          <div class="row">
            <div class="col-md-6">
              <form class="anet-attach-ef">
                <div class="form-group">
                  <label for="attachEFName">Essential Function</label>
                  <input id="attachEFName">
                </div>

                <div class="form-group">
                  <label for="attachEFMilestones">Milestones</label>
                  <select id="attachEFMilestones" multiple="multiple">
                  </select>
                </div>

                <div class="form-group">
                  <label for="attachEFActions">Actions</label>
                  <select id="attachEFActions" multiple="multiple">
                  </select>
                </div>

                <div class="form-group">
                  <input type="submit" value="Add EF" class="btn btn-default pull-right">
                </div>
              </form>
            </div>

            <div class="col-md-6">
              <table>
                <tr>
                  <th>Essential Function</th>
                  <th>POAM</th>
                  <th>Level</th>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="anet-block">
        <div class="anet-block__title">
          Summary
        </div>

        <div class="anet-block__body">
          <div class="form-group">
            <label for="engagementSummary">Executive Summary</label>
            <textarea id="engagementSummary"></textarea>
          </div>
        </div>
      </section>

      <input type="submit" value="Submit" class="btn btn-default pull-right">
    </form>


    <!-- jQuery (necessary for Bootstrap's JavaScript plugins) -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
    <!-- Include all compiled plugins (below), or include individual files as needed -->
    <script src="js/bootstrap.min.js"></script>
  </body>
</html>
