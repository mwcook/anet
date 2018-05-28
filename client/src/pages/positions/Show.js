import PropTypes from 'prop-types'

import React from 'react'
import Page, {mapDispatchToProps} from 'components/Page'
import {Link} from 'react-router-dom'
import {Table, Button} from 'react-bootstrap'
import moment from 'moment'

import Fieldset from 'components/Fieldset'
import Breadcrumbs from 'components/Breadcrumbs'
import Form from 'components/Form'
import LinkTo from 'components/LinkTo'
import Messages, {setMessages} from 'components/Messages'
import AssignPersonModal from 'components/AssignPersonModal'
import EditAssociatedPositionsModal from 'components/EditAssociatedPositionsModal'

import GuidedTour from 'components/GuidedTour'
import {positionTour} from 'pages/HopscotchTour'

import API from 'api'
import Settings from 'Settings'
import {Position, Organization} from 'models'
import autobind from 'autobind-decorator'

import ConfirmDelete from 'components/ConfirmDelete'

import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'

class PositionShow extends Page {

	static propTypes = Object.assign({}, Page.propTypes)

	static contextTypes = {
		currentUser: PropTypes.object.isRequired,
	}

	static modelName = 'Position'

	constructor(props) {
		super(props)

		this.state = {
			position: new Position( {
				uuid: props.match.params.uuid,
				previousPeople: [],
				associatedPositions: [],
				showAssignPersonModal: false,
				showAssociatedPositionModal: false,
			}),
		}

		setMessages(props, this.state)
	}

	fetchData(props) {
		API.query(/* GraphQL */`
			position(uuid:"${props.match.params.uuid}") {
				uuid, name, type, status, code,
				organization { uuid, shortName, longName, identificationCode },
				person { uuid, name, rank },
				associatedPositions {
					uuid, name,
					person { uuid, name, rank }
				},
				previousPeople { startTime, endTime, person { uuid, name, rank }}
				location { uuid, name }
			}
		`).then(data => this.setState({position: new Position(data.position)}))
	}

	render() {
		const position = this.state.position
		const assignedRole = position.type === Position.TYPE.PRINCIPAL ? Settings.fields.advisor.person.name : Settings.fields.principal.person.name // TODO: shouldn't this be Position.humanNameOfType instead of a person title?

		const currentUser = this.context.currentUser
		const canEdit =
			//Super Users can edit any Principal
			(currentUser.isSuperUser() && position.type === Position.TYPE.PRINCIPAL) ||
			//Admins can edit anybody
			(currentUser.isAdmin()) ||
			//Super users can edit positions within their own organization
			(position.organization && position.organization.uuid && currentUser.isSuperUserForOrg(position.organization))
		const canDelete = (currentUser.isAdmin()) &&
			position.status === Position.STATUS.INACTIVE &&
			(position.uuid && ((!position.person) || (!position.person.uuid)))

		return (
			<div>
				<div className="pull-right">
					<GuidedTour
						title="Take a guided tour of this position's page."
						tour={positionTour}
						autostart={localStorage.newUser === 'true' && localStorage.hasSeenPositionTour !== 'true'}
						onEnd={() => localStorage.hasSeenPositionTour = 'true'}
					/>
				</div>

				<Breadcrumbs items={[[position.name || 'Position', Position.pathFor(position)]]} />
				<Messages success={this.state.success} error={this.state.error} />

				<Form static formFor={position} horizontal>
					<Fieldset title={position.name} action={
						canEdit && <LinkTo position={position} edit button="primary" className="edit-position">Edit</LinkTo>
					}>
						<Form.Field id="code" />

						<Form.Field id="type">
							{position.humanNameOfType()}
						</Form.Field>

						<Form.Field id="status" />

						{position.organization && <Form.Field id="organization" label="Organization" value={position.organization && position.organization.shortName} >
							<Link to={Organization.pathFor(position.organization)}>
								{position.organization.shortName} {position.organization.longName} {position.organization.identificationCode}
							</Link>
						</Form.Field>}

						<Form.Field id="location" label="Location">
							{position.location && <LinkTo anetLocation={position.location}>{position.location.name}</LinkTo>}
						</Form.Field>
					</Fieldset>

					<Fieldset title="Current assigned person"
						id="assigned-advisor"
						className={(!position.person || !position.person.uuid) ? 'warning' : undefined}
						style={{textAlign: 'center'}}
						action={position.person && position.person.uuid && canEdit && <Button onClick={this.showAssignPersonModal}>Change assigned person</Button>} >
						{position.person && position.person.uuid
							? <div>
								<h4 className="assigned-person-name"><LinkTo person={position.person}/></h4>
								<p></p>
							</div>
							: <div>
								<p className="position-empty-message"><em>{position.name} is currently empty.</em></p>
									{canEdit &&
										<p><Button onClick={this.showAssignPersonModal} className="change-assigned-person">Change assigned person</Button></p>
									}
							</div>
						}
						<AssignPersonModal
							position={position}
							showModal={this.state.showAssignPersonModal}
							onCancel={this.hideAssignPersonModal.bind(this, false)}
							onSuccess={this.hideAssignPersonModal.bind(this, true)}
						/>
					</Fieldset>

					<Fieldset title={`Assigned ${assignedRole}`}
						id="assigned-principal"
						action={canEdit && <Button onClick={this.showAssociatedPositionModal}>Change assigned {assignedRole}</Button>}>
						<Table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Position</th>
								</tr>
							</thead>
							<tbody>
								{Position.map(position.associatedPositions, (pos, idx) =>
									this.renderAssociatedPositionRow(pos, idx)
								)}
							</tbody>
						</Table>

						{position.associatedPositions.length === 0 &&
							<em>{position.name} has no associated {assignedRole}</em>
						}

						{canEdit && <EditAssociatedPositionsModal
							position={position}
							showModal={this.state.showAssociatedPositionModal}
							onCancel={this.hideAssociatedPositionsModal.bind(this, false)}
							onSuccess={this.hideAssociatedPositionsModal.bind(this, true)}
						/>}
					</Fieldset>

					<Fieldset title="Previous position holders" id="previous-people">
						<Table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Dates</th>
								</tr>
							</thead>
							<tbody>
								{position.previousPeople.map( (pp, idx) =>
									<tr key={idx} id={`previousPerson_${idx}`}>
										<td><LinkTo person={pp.person} /></td>
										<td>
											{moment(pp.startTime).format('D MMM YYYY')} - &nbsp;
											{pp.endTime && moment(pp.endTime).format('D MMM YYYY')}
										</td>
									</tr>
								)}
							</tbody>
						</Table>
					</Fieldset>
				</Form>

				{canDelete && <div className="submit-buttons"><div>
					<ConfirmDelete
						onConfirmDelete={this.deletePosition}
						objectType="position"
						objectDisplay={'#' + this.state.position.uuid}
						bsStyle="warning"
						buttonLabel="Delete position"
						className="pull-right" />
				</div></div>}
			</div>
		)
	}

	renderAssociatedPositionRow(pos, idx) {
		let personName = 'Unfilled'
		if (pos.person) {
			personName = <LinkTo person={pos.person} />
		}
		return <tr key={pos.uuid} id={`associatedPosition_${idx}`}>
			<td>{personName}</td>
			<td><Link to={Position.pathFor(pos)}>{pos.name}</Link></td>
		</tr>
	}

	@autobind
	showAssignPersonModal() {
		this.setState({showAssignPersonModal: true})
	}

	@autobind
	hideAssignPersonModal(success) {
		this.setState({showAssignPersonModal: false})
		if (success) {
			this.fetchData(this.props)
		}
	}

	@autobind
	showAssociatedPositionModal() {
		this.setState({showAssociatedPositionModal: true})
	}

	@autobind
	hideAssociatedPositionsModal(success) {
		this.setState({showAssociatedPositionModal: false})
		if (success) {
			this.fetchData(this.props)
		}
	}

	@autobind
	deletePosition() {
		API.send(`/api/positions/${this.state.position.uuid}`, {}, {method: 'DELETE'}).then(data => {
			this.props.history.push({
				pathname: '/',
				state: {success: 'Position Deleted'}
			})
		}, data => {
			this.setState({success: null, error: data})
		})
	}
}

export default connect(null, mapDispatchToProps)(withRouter(PositionShow))
